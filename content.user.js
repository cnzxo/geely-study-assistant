// ==UserScript==
// @name         吉时学助手
// @namespace    https://github.com/cnzxo
// @version      1.0.0
// @description  吉时学在线课程学习助手，帮助用户更好的完成学习和考试任务。
// @author       www@cnzxo.com
// @match        https://elearning.geely.com/
// @icon         https://www.google.com/s2/favicons?sz=64&domain=geely.com
// @grant        none
// @license      GPL-3.0-only
// @copyright    2025, https://github.com/cnzxo
// ==/UserScript==

(async function () {
    'use strict';

    // 防止插件和油猴脚本重复运行
    if (document.documentElement.dataset.__geely_study_running__ === "true") {
        console.log("检测到插件已运行，该脚本不执行！");
        return;
    }
    document.documentElement.dataset.__geely_study_running__ = "true";

    // 获取页面URL
    async function GetUrl(data, name) {
        for (const item of data) {
            if (item.name === name) {
                return item.url;
            }
        }
        return "";
    }

    // 更新考试列表页面内容
    async function UpdateExamList(data) {
        let attempts = 0;
        const interval = setInterval(async () => {
            const trNodes = document.querySelectorAll('#user-center-exam-2 > div.exam-type.exam-type-2 > ul > li > table > tbody > tr');
            if (trNodes) {
                trNodes.forEach(async (trNode) => {
                    const tdNode1 = trNode.querySelector('td.singleLineName');
                    const tdNode2 = trNode.querySelector('td > span.color-grey');
                    if (tdNode1 && tdNode2 && tdNode2.textContent === "管理员已设置不能查看该试卷") {
                        const name = tdNode1.textContent;
                        const url = await GetUrl(data, name);
                        if (url === "") return;
                        tdNode2.innerHTML = `<a href="${url}">
                                                <i class="ion-android-arrow-dropright-circle mr8"></i>
                                                <time data-i18n="public_view">查看</time>
                                            </a>`;
                    }
                });
                clearInterval(interval);
                return;
            } else if(attempts > 10) {
                console.warn("❌ timeout");
                clearInterval(interval);
                return;
            }
            attempts++;
        }, 500);
    }

    // 请求考试列表
    async function RequestExamList(pageNum) {
        const timestamp = Date.now();
        const url = `https://elearning.geely.com/gke/user/exam/list?pageNum=${pageNum}&pageSize=10&examStatus=2&flag=&_=${timestamp}`
        await fetch(url)
            .then(async response => {
                if (!response.ok) {
                    throw new Error('网络请求失败');
                }
                return response.json();
            })
            .then(async response => {
                const data = [];
                for (const item of response.data.items) {
                    if (item.resultFlag === 1) {
                        data.push({
                            id: item.id,
                            name: item.examName,
                            url: "https://elearning.geely.com/#/user/examview/" + item.id,
                        });
                    }
                }
                await UpdateExamList(data);
            })
            .catch(async error => {
                console.error('请求失败:', error);
            });
    }

    // 等待页面加载完成
    async function waitForLoad() {
        let attempts = 0;
        const interval = setInterval(async () => {
            const pageItems = document.querySelectorAll('li.page-number');
            if (pageItems && pageItems.length !== 0) {
                pageItems.forEach(item => {
                    if (item.className.indexOf("active") !== -1 || item.className.indexOf("disabled") !== -1 || (item.dataset.flag && item.dataset.flag === true)) {
                        return;
                    }
                    item.dataset.flag = true;
                    item.addEventListener('click', async () => {
                        const currentPage = document.querySelector("li.page-number.active");
                        if (!currentPage) {
                            return;
                        }
                        let pageNum = Number(currentPage.textContent.trim());
                        await RequestExamList(pageNum);
                        await waitForLoad();
                    });
                });
                clearInterval(interval);
                return;
            } else if(attempts > 10) {
                console.warn("❌ timeout");
                clearInterval(interval);
                return;
            }
            attempts++;
        }, 500);
    }

    // 监听菜单按钮点击事件
    document.addEventListener('click', async function (event) {
        const target = event.target.closest('a');
        if (!target || !target.href) return;
        const hash = target.hash;
        if (hash && hash === "#user-center-exam-2") {
            await RequestExamList(1);
            await waitForLoad();
        }
    });
})();

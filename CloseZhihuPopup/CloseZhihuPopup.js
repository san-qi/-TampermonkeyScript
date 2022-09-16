// ==UserScript==
// @name         Close Zhihu Popup
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  自动关闭知乎网页版的初始登录窗口
// @homepage     https://github.com/san-qi/TampermonkeyScript/tree/main/CloseZhihuPopup
// @author       san-qi
// @license      GPLv3
// @match        https://*.zhihu.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=zhihu.com
// @grant        none
// ==/UserScript==

(window.onload=function() {
    'use strict';
    var btn=document.querySelector('div.Modal.Modal--default.signFlowModal > button');
    btn.click();
    // document.body.scrollIntoView;
    // var body=document.querySelector('div.css-1ynzxqw > div.css-1izy64v > svg');
    // body.click();
})();

// ==UserScript==
// @name         Download NetEase Music
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  �������׸赥,���ظø赥�ڵ����и���
// @author       san-qi
// @match        *://music.163.com/*
// @require      https://cdn.bootcdn.net/ajax/libs/handsontable/8.3.2/handsontable.full.min.js
// @resource     https://cdn.bootcdn.net/ajax/libs/handsontable/8.3.2/handsontable.full.min.css
// @require      https://cdn.jsdelivr.net/npm/sweetalert2@11.4.32/dist/sweetalert2.all.min.js
// @icon         data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_download
// @run-at       document-end
// ==/UserScript==


(function() {
    'use strict';

    var ui = {
        get_messenger: function(){
            // ����ͬʱ���ֶ��messenger
            var shown_message = false;

            return (title, content = "<div id='netEaseMusicWrapper'></div>", icon = "success", width = "32em") => {
                if(shown_message == false){
                    shown_message = true;
                    Swal.fire({
                        icon: icon,
                        backdrop: `rgba(0,0,123,0.4)
                              url("/images/nyan-cat.gif")
                              left top
                              no-repeat`,
                        allowOutsideClick: false,
                        position: 'center',
                        width: width,
                        showConfirmButton: true,
                        title: title,
                        html: content
                    }).then(function(isConfirm){
                        shown_message = false;
                    });
                }else{
                    // console.log("message cannot be shown");
                }
            }
        },

        show_table: function(wrapper_id, data, col_width, merge_cells = undefined){
            // console.log(data, col_width);
            if(data === undefined){
                return;
            }

            var wrapper = document.getElementById(wrapper_id);
            var wrapper_width = wrapper.clientWidth;
            var table = new Handsontable(
                wrapper,
                {
                    className: "htCenter htMiddle",
                    data: data,
                    colWidths: col_width.map(item => Math.ceil(item*wrapper_width)),
                    autoWrapRow: true,
                    autoColumnSize: true,
                    height: 'auto',
                    width: wrapper_width,
                    mergeCells: merge_cells,
                    licenseKey: 'non-commercial-and-evaluation'
                });
            // ȫ��ֻ���Ҳ���ѡ��
            table.updateSettings({readOnly: true, disableVisualSelection: true});
            table.render();
        }
    }
    var messenger = ui.get_messenger();

    var network = {
        // ��ȡ�赥ҳ���µ����и�����Ϣ
        get_playlist_info(){
            var doc = document.getElementById("g_iframe").contentDocument;
            var info = {"ids":[], "names":[]};
            var names = doc.querySelectorAll(".m-table tbody b");
            var singers = doc.querySelectorAll(".m-table tbody td:nth-child(4) span[title]");
            var ids = doc.querySelectorAll(".m-table tbody td:nth-child(1) span.ply");
            names.forEach((item, i) => info.names.push(item.title+' - '+singers[i].title));
            ids.forEach(item => info.ids.push(item.getAttribute("data-res-id")));

            return info;
        },

        // ���ظ���
        // TODO  Resend on failed
        download(id, name, on_succeed, on_error, on_intercept){
            // ����URL����
            var url = "http://music.163.com/song/media/outer/url?id="+id+".mp3";

            return new Promise(
                (resolve, reject) =>
                GM_xmlhttpRequest({
                    method: "get",
                    url: url,
                    binary: true,
                    responseType: "blob",
                    onload: function(r) {
                        // console.log(r);
                        // �ж��Ƿ�������������
                        if(r.status == 204){
                            reject();
                        }
                        // �ж�ָ�����Դ�Ƿ���ȷ
                        else if(r.response.type != "text/html;charset=utf8"){
                            // ����������Դ,�����ڵ�ַ��Ϊr.finalUrl
                            resolve(r.finalUrl);
                        }
                        else{
                            reject("that song not found");
                        }
                    },
                    onerror: err => reject(err)
                })
            ).then(
                // ������Դ������
                // ����thenʱ����Promise���������е���resolve��reject����
                target_url => new Promise(
                    (resolve, reject) =>
                    GM_download({
                        url: target_url,
                        name: name+".mp3",
                        // TODO Use parameter to judge
                        saveAs: false,
                        onload: res => resolve(name),
                        onerror: err => reject("network fluctuations")
                    })
                )
            ).then(
                // ������ɺ� ��ִ�в���
                data => {
                    // console.log(data + " download success");
                    on_succeed(data);
                }
            ).catch(
                err => {
                    // �����쳣
                    if(err){
                        on_error(err);
                    }
                    // ��������
                    else{
                        on_intercept();
                    }
                }
            );
        }
    }

    // �����������������
    function sort_then_generate(failure, column){
        if(failure === undefined){
            return {};
        }
        // console.log(failure);
        failure.sort((a, b) => b.length - a.length);

        var result = {};
        const len = failure.length;
        const row = Math.ceil(len/column);
        result.row_num = row;
        result.column_num = Math.min(column, failure.length);

        // ��������
        result.data = [];
        // ������һ���Է�ֹ�ײ����ڵ�
        for(let _=0; _<=row; _++){
            result.data.push([]);
        };
        for(let i=0; i<len; ++i){
            result.data[i%row].push(failure[i]);
        };
        // // �������һ��
        // for(let i=len%column; i<column; ++i){
        //    result.data[row-1].push("");
        // }

        // ���ø���ռ��
        result.colWidths = [];
        var colSumWidths = 0;
        for(let i=0; i<result.column_num; ++i){
            let length = result.data[0][i].length;
            colSumWidths += length;
            result.colWidths.push(length);
        }
        result.colWidths = result.colWidths.map(item => item/colSumWidths);

        return result;
    }

    function main(){
        var info = network.get_playlist_info();
        var ids = info.ids;
        var names = info.names;
        var success = [];
        var failure = [];

        var url = window.location.href;
        // λ�ڸ赥ҳ��
        if (/https?:\/\/music\.163\.com\/.*\/playlist\?id=\d*/i.test(url)){
            Promise.all(
                // ����
                ids.map((item, i) => {
                    // �����return,�����ֱ��������������ִ��
                    // �Ӷ�����Promise::allʧЧ,��������������Դ������ɺ��ͳ��������Ϊ��ǰִ��
                    // �⽫��ʹͳ�ƵĽ������ƫ��
                    return network.download(
                        item, names[i],
                        (data) => {
                            success.push(names[i]);
                        },
                        (err) => {
                            failure.push(names[i]);
                        },
                        () => {
                            messenger(
                                "����ʧ��",
                                "<div id='netEaseMusicWrapper'>����ʱ�ر� IDM ��������������Ȩ��<br>�� 'http://*.126.net/*.mp3' ���뵽������������</div>",
                                "error"
                            );
                        },
                    );
                })
            ).then(
                // ����ִ����Ϻ�,ͳ������ʧ�ܵ���Դ
                () => {
                    // ������ʾ
                    messenger(
                        "��" + success.length + "����Ŀ���سɹ�; " + failure.length + "������ʧ��",
                        '<div id="netEaseMusicWrapper"></div>',
                        "success",
                        "90%"
                    );

                    // TODO Use parameter to judge
                    const column_num = 3;
                    var result = sort_then_generate(failure, column_num);
                    // ������Ƕ���,ͨ�����չʾ����ʧ�ܵ���Ϣ
                    ui.show_table("netEaseMusicWrapper", result.data, result.colWidths);
                }
            );
        }
        // λ�ڵ���ҳ��
        else if (/https?:\/\/music\.163\.com\/.*\/song\?id=\d*/i.test(url)){
            var doc = document.getElementById("g_iframe").contentDocument;
            var song = doc.querySelector("div.g-bd4.f-cb > div.g-mn4 > div > div > div.m-lycifo > div.f-cb > div.cnt > div.hd > div > em").innerText;
            var singer = doc.querySelector("div.g-bd4.f-cb > div.g-mn4 > div > div > div.m-lycifo > div.f-cb > div.cnt > p > span").title;
            var id = /song\?id=(\d*)/i.exec(window.location.hash)[1];
            network.download(
                id, song + " - " + singer,
                (data) => {
                    messenger("���سɹ�");
                },
                (err) => {
                    messenger(
                        "����ʧ��",
                        "<div id='netEaseMusicWrapper'>�������������ø�����Դδ�ҵ�</div>",
                        "warning"
                    );
                },
                () => {
                    messenger(
                        "����ʧ��",
                        "<div id='netEaseMusicWrapper'>����ʱ�ر� IDM ��������������Ȩ��<br>�� 'http://*.126.net/*.mp3' ���뵽������������</div>",
                        "error"
                    );
                }
            );
        }
        // λ������ҳ��
        else{
            messenger(
                "��ǰҳ�治��ִ�иò���",
                "<div id='netEaseMusicWrapper'>���ڸ赥ҳ�����ҳ����ִ�в���</div>",
                "warning"
            );
        }
    }

    function init(){
        // ȥ���赥��Ŀ����
        document.cookie="os=pc";
        // ���ҽ���λ�ڸ赥ҳ��ִ��ҳ��ˢ��
        if (/https?:\/\/music\.163\.com\/.*\/playlist\?id=\d*/i.test(window.location.href)){
            document.getElementById('g_iframe').contentWindow.location.reload(true);
        }
    }

    function tips(){
        messenger(
            "��ǰ��֪",
            "<div id='netEaseMusicWrapper'></div>",
            "question"
        );
        ui.show_table(
            "netEaseMusicWrapper",
            [
                ["1. ", "��������ҳ�����20����Ŀ������"],
                ["1. ", "���赥��ʾ��ȫʱ�����ýű��ĵڶ���ѡ��"],
                ["1. ", "����ű�ֻ�����ظ赥ǰ20����Ŀ"],
                ["~~~", "~~~"],
                ["2. ", "����PC�ϰ�װ��IDM��������"],
                ["2. ", "��� 'http://*.126.net/*.mp3' ����"],
                ["2. ", "����ͨ��IDM�����ļ�����������"],
                ["~~~", "~~~"],
                ["3. ", "��� '��ȡ' ��������"],
                ["3. ", "����ʱ����ܺܳ�"],
                ["3. ", "�����ĵȺ�"],
                ["~~~", "~~~"],
                ["Enjoy those song!", "Enjoy those song!"],
            ],
            [0.1, 0.9],
            [
                { row: 0, col: 0, rowspan: 3, colspan: 1 },
                { row: 3, col: 0, rowspan: 1, colspan: 2 },
                { row: 4, col: 0, rowspan: 3, colspan: 1 },
                { row: 7, col: 0, rowspan: 1, colspan: 2 },
                { row: 8, col: 0, rowspan: 3, colspan: 1 },
                { row: 11, col: 0, rowspan: 1, colspan: 2 },
                { row: 12, col: 0, rowspan: 1, colspan: 2 },
            ],
        );
    }

    GM_registerMenuCommand("��ǰ��֪", tips, "");
    GM_registerMenuCommand("�������", init, "");
    GM_registerMenuCommand("��ȡ", main, "");
})();
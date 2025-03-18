function generate16BitUUID() {
    const fullUUID = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
    const shortUUID = fullUUID.replace(/-/g, '').substring(0, 16);
    document.getElementById('randomString').innerText = shortUUID;
}

function formatJSON() {
    const input = document.getElementById('jsonInput').value;
    const outputElement = document.getElementById('jsonOutput');
    try {
        const json = JSON.parse(input);
        const formattedJSON = JSON.stringify(json, null, '\t');
        outputElement.innerText = formattedJSON;
    } catch (e) {
        outputElement.innerText = '格式不对';
    }
}

function encodeBase64() {
    const input = document.getElementById('base64EncodeInput').value;
    const outputElement = document.getElementById('base64EncodeOutput');
    const encoded = btoa(unescape(encodeURIComponent(input))); // 支持中文编码
    outputElement.innerText = encoded;
}

function decodeBase64() {
    const input = document.getElementById('base64DecodeInput').value;
    const outputElement = document.getElementById('base64DecodeOutput');
    try {
        const decoded = atob(input);
        outputElement.innerText = decoded;
    } catch (e) {
        outputElement.innerText = '格式不对';
    }
}

function toggleTheme() {
    document.body.classList.toggle('dark-theme');
    const themeToggle = document.getElementById('themeToggle');
    if (document.body.classList.contains('dark-theme')) {
        themeToggle.innerText = '切换到浅色模式';
    } else {
        themeToggle.innerText = '切换到深色模式';
    }
}

// 初始化主题按钮文本和默认主题
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('themeToggle');
    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDarkScheme) {
        document.body.classList.add('dark-theme');
        themeToggle.innerText = '切换到浅色模式';
    } else {
        themeToggle.innerText = '切换到深色模式';
    }

    // 获取用户 IP 和归属地
    fetch('https://ipapi.co/json/')
        .then(response => response.json())
        .then(data => {
            const userIpInfo = document.getElementById('userIpInfo');
            userIpInfo.innerText = `当前公网IP：${data.ip} | ${data.country_name}, ${data.region}, ${data.city}`;
        })
        .catch(error => {
            const userIpInfo = document.getElementById('userIpInfo');
            userIpInfo.innerText = '无法获取您的 IP 和归属地';
            console.error('Error:', error);
        });

    // 初始化翻页时钟
    setInterval(updateClock, 1000);
    updateClock();
});

function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('flipClock').innerText = `${hours}:${minutes}:${seconds}`;
}

function openIframe() {
    const iframeContainer = document.getElementById('iframeContainer');
    const iframe = document.getElementById('iframe');
    const url = document.getElementById('iframeUrlInput').value;
    iframe.src = url;
    iframeContainer.style.display = 'block';
}

function closeIframe() {
    const iframeContainer = document.getElementById('iframeContainer');
    const iframe = document.getElementById('iframe');
    iframe.src = '';
    iframeContainer.style.display = 'none';
}

let xhr; // 全局变量用于控制下载请求

function startDownload() {
    const url = document.getElementById('downloadUrlInput').value;
    const downloadStatus = document.getElementById('downloadStatus');
    const downloadProgress = document.getElementById('downloadProgress');

    xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'blob';

    xhr.onprogress = function(event) {
        if (event.lengthComputable) {
            const percent = (event.loaded / event.total) * 100;
            downloadProgress.value = percent;
            downloadStatus.innerText = `下载中... ${Math.round(percent)}% (${event.loaded} / ${event.total} bytes)`;
        }
    };

    xhr.onload = function() {
        if (xhr.status === 200) {
            const blob = xhr.response;
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = downloadUrl;
            a.download = 'downloaded_file';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(downloadUrl);
            downloadStatus.innerText = '下载完成';
        } else {
            downloadStatus.innerText = '下载失败';
        }
    };

    xhr.onerror = function() {
        downloadStatus.innerText = '下载失败';
    };

    xhr.send();
}

function pauseDownload() {
    if (xhr) {
        xhr.abort();
        document.getElementById('downloadStatus').innerText = '下载已暂停';
    }
}

function clearDownloadCache() {
    document.getElementById('downloadUrlInput').value = '';
    document.getElementById('downloadStatus').innerText = '等待下载...';
    document.getElementById('downloadProgress').value = 0;
}

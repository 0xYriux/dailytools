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

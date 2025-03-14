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
        outputElement.innerText = '输入的不是 JSON';
    }
}

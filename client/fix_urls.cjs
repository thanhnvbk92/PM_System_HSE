const fs = require('fs');
const path = require('path');
const walk = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
        file = dir + '/' + file;
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            results.push(file);
        }
    });
    return results;
};
const files = walk('./src').filter(f => f.endsWith('.js') || f.endsWith('.jsx'));
files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    if (content.includes('http://:5000') || content.includes('http://localhost:5000')) {
        content = content.replace(/http:\/\/:5000/g, 'http://${window.location.hostname}:5000');
        // also replace any remaining localhost, just in case
        content = content.replace(/http:\/\/localhost:5000/g, 'http://${window.location.hostname}:5000');

        // Wait, those are inside strings like axios.get('http://...'), they need to be backticks.
        // I will replace 'http://${window.location.hostname}:5000' with `http://${window.location.hostname}:5000`
        // Actually the best way is:
        content = content.replace(/'http:\/\/:5000/g, '`http://${window.location.hostname}:5000');
        content = content.replace(/http:\/\/:5000'/g, 'http://${window.location.hostname}:5000`');

        content = content.replace(/'http:\/\/localhost:5000/g, '`http://${window.location.hostname}:5000');
        content = content.replace(/http:\/\/localhost:5000'/g, 'http://${window.location.hostname}:5000`');

        fs.writeFileSync(f, content);
        console.log('Fixed ' + f);
    }
});

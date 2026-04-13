const fs = require('fs');
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
    // We want to replace exactly: 'http://${window.location.hostname}:5000/
    // with: `http://${window.location.hostname}:5000/

    // Using Regex:
    // Any single quote followed by http://${window.location.hostname}:5000 should become backtick
    content = content.replace(/'http:\/\/\$\{window\.location\.hostname\}:5000/g, "`http://${window.location.hostname}:5000");

    // But wait, the closing quote is also a single quote. We can't simply find a global single quote.
    // We can replace `'http://${window.location.hostname}:5000` with `` `http://${window.location.hostname}:5000 ``
    // Then we must also replace the closing quote of that specific URL!
    // It's easier: just replace ALL axios.get/post/put/delete('http://... with `http://...`

    // Let's use a regex that matches 'http://${window.location.hostname}:5000/some/path'
    content = content.replace(/'(http:\/\/\$\{window\.location\.hostname\}:5000[^']*)'/g, "`$1`");

    fs.writeFileSync(f, content);
    console.log('Fixed quotes in ' + f);
});

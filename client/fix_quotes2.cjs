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

    // Replace: `http://${window.location.hostname}:5000/foo'
    // With: `http://${window.location.hostname}:5000/foo`
    content = content.replace(/(`http:\/\/\$\{window\.location\.hostname\}:5000[^']*)'/g, "$1`");

    // Replace: 'http://${window.location.hostname}:5000/baz'
    // With: `http://${window.location.hostname}:5000/baz`
    content = content.replace(/'(http:\/\/\$\{window\.location\.hostname\}:5000[^']*)'/g, "`$1`");

    // Replace dangling quote cases if any
    content = content.replace(/http:\/\/\$\{window\.location\.hostname\}:5000([^']*)'/g, "http://${window.location.hostname}:5000$1`");

    fs.writeFileSync(f, content);
    console.log('Fixed quotes 2 in ' + f);
});

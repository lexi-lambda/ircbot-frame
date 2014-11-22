
var fs = require('fs');

var corpus = fs.readdirSync('./corpus').map(function (el) {
    return fs.readFileSync('./corpus/' + el).toString();
}).reduce(function (previous, current) {
    return previous + current;
}).replace(/[“”]/g,'"').replace(/[‘’]/g, '\'').split(' ');

var dictionary = {};

for (var i = 0; i < corpus.length - 2; i++) {
    var key = corpus[i] + ' ' + corpus[i+1];
    if (dictionary[key]) {
        dictionary[key].push(corpus[i+2]);
    } else {
        dictionary[key] = [corpus[i+2]];
    }
}

function nextWord(a, b) {
    var choices = dictionary[a + ' ' + b];
    if (!choices) {
        return '.';
    }
    return choices[Math.floor(Math.random() * choices.length)];
}

function randomStart() {
    var index = -1;
    var word = '';
    while (!/^[A-Z]/.test(word)) {
        index = Math.floor(Math.random() * (corpus.length - 2));
        word = corpus[index];
    }
    return index;
}

function generate(length) {
    var s = randomStart();
    var generated = [corpus[s], corpus[s + 1]];
    for (var i = 0; i < length; i++) {
        generated.push(nextWord(generated[generated.length - 2], generated[generated.length - 1]));
    }
    while (!/[.!?]$/.test(generated[generated.length - 1])) {
        generated.push(nextWord(generated[generated.length - 2], generated[generated.length - 1]));
    }
    return generated.join(' ');
}

exports.generate = generate;

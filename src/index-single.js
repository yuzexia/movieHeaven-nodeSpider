
let cheerio = require('cheerio');
let http = require('http');
let iconv = require('iconv-lite');

let url = 'http://www.ygdy8.net/html/gndy/dyzz/index.html'; // 基于单页


http.get(url, (response) => {
    let chunks = [];
    response.on('data', (chunk) => {
        chunks.push(chunk);
        // console.log('cccc', iconv.decode(chunk, 'gb2312'))
    });
    // chunks里面存储着网页的 html 内容，将它zhuan ma传给 cheerio.load 之后
    // 就可以得到一个实现了 jQuery 接口的变量，将它命名为 `$`
    // 剩下就都是 jQuery 的内容了
    response.on('end', () => {
        let titles = [];
        //由于咱们发现此网页的编码格式为gb2312，所以需要对其进行转码，否则乱码
        //依据：“<meta http-equiv="Content-Type" content="text/html; charset=gb2312">”
        let html = iconv.decode(Buffer.concat(chunks), 'gb2312');
        let $ = cheerio.load(html, {decodeEntities: false});
        $('.co_content8 .ulink').each((index, element) => {
            let ele = $(element);
            titles.push({title: ele.text()})
        });

        console.log('pageTitle', titles)
    })
})
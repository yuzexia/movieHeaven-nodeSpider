
let cheerio = require('cheerio');
let http = require('http');
let URL = require('url');
let iconv = require('iconv-lite');
let querystring = require('querystring');
let async = require('async');

let index = 1; // 页数控制
let url = 'http://www.ygdy8.net/html/gndy/dyzz/list_23_';
let movies = [];
let host = 'http://www.ygdy8.net'
// let mongoUrl = 'mongodb://localhost:27017/movieheaven'
let mongoUrl = 'mongodb://localhost:27017/'

//由于咱们发现此网页的编码格式为gb2312，所以需要对其进行转码，否则乱码
//依据：“<meta http-equiv="Content-Type" content="text/html; charset=gb2312">”

// 获取电影页面url
function getTitle(url, i) {
    console.log('正在获取第' + i + '页内容...');
    let maxIndex = 0;
    http.get(`${url}${i}.html`, response => {
        let chunks = [];
        response.on('data', (chunk) => {
            // console.log('----------', iconv.decode(chunk, 'gb2312'))
            chunks.push(chunk);
        })

        response.on('end', () => {
            let html = iconv.decode(Buffer.concat(chunks), 'gb2312');
            let $ = cheerio.load(html, {devodeEntitles: false});
            let _arr = $('.co_content8 .x select').text().split('\n').filter(item => {
                return item !== ''
            });
            maxIndex = _arr.length
            $('.co_content8 .ulink').each((idx, element) => {
                let ele = $(element);
                movies.push({
                    title: ele.text(),
                    href: `${host}${ele.attr('href')}`
                })
            })
            if (index < maxIndex) {
                getTitle(url, ++index);
            } else {
                console.log('爬完了...')
                // console.log('movies:', movies)
                getBlink(movies, 0);
            }
        })
    })
}

// 获取电影下载链接
function getBlink(urls, index){
    console.log('正在获取电影：' + urls[index].title + ' 的内容...');
    // movies[index].downloads = []
    http.get(urls[index].href, response => {
        let chunks = []
        response.on('data', chunk => {
            // console.log('chunk', chunk)
            chunks.push(chunk)
        })
        response.on('end', () => {
            let html = iconv.decode(Buffer.concat(chunks), 'gb2312');
            let $ = cheerio.load(html, {devodeEntitles: false});
            $('#Zoom td').children('a').each((idx, element) => {
                let ele = $(element)
                movies[index].bt = ele.attr('href');
            })
            $('#Zoom p').children('a').each((idx, element) => {
                let ele = $(element);
                movies[index].magnet = querystring.unescape(ele.attr('href'));
            });
            updateMongo(movies[index]); // array索引从0开始。
            if (index < urls.length - 1) {
                getBlink(movies, ++index);
            } else {
                console.log('blink获取完毕...');
                // console.log(movies);
                // saveMongo();
            }
        })
    })
}

// 保存到mongodb
function saveMongo() {
    let MongoClient = require('mongodb').MongoClient; // 导入依赖
    MongoClient.connect(mongoUrl, {useNewUrlParser:true}, (err, db) => {
        if (err) {
            console.log('err:::', err);
            return ;
        } else {
            console.log('成功连接数据库');
            let collection = db.db('MovieHeaven').collection('movies');
            collection.insertMany(movies, (err, result) => {
                if (err) {
                    console.log(err);
                } else {
                    console.log('保存数据成功')
                }
            })
            db.close();
        }
    });
}

// 插入文档mongodb
function updateMongo(data) {
    let MongoClient = require('mongodb').MongoClient; // 导入依赖
    MongoClient.connect(mongoUrl, {useNewUrlParser: true}, (err, db) => {
        if (err) {
            console.log('err:::', err);
            return ;
        } else {
            console.log('成功连接数据库');
            let collection = db.db('MovieHeaven').collection('movies');
            collection.findOne({title: data.title}, (err, result) => {
                if (err) {
                    console.log('err:::', err);
                    return ;
                } else {
                    if (result) {
                        console.log('该数据已经存在....')
                    } else {
                        collection.insertOne(data, (error, res) => {
                            if (error) {
                                console.log('error', error);
                            } else {
                                console.log('数据插入成功');
                                db.close();
                            }
                        })
                    }
                }
            });
        }
    })
}

function main() {
    console.log('开始爬取');
    getTitle(url, index);
}

main()

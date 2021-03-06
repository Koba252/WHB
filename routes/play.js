var express = require('express');
var router = express.Router();

var wordList = require('../wordList.json');
var db = require('../db/index');

var selectLv = (lv, rreq) => {
  var ans;
  while(true){
    var aaa = wordList[Math.floor(Math.random() * wordList.length)];
    if (aaa.level == lv){
      ans = aaa.word;
      console.log(ans);
      break;
    }
  }
  var ansAry = ans.split('');
  console.log(ansAry);
  rreq.session.answ = ansAry;
}

var renderData = {
  title: 'easy | Word Hit & Blow',
  urlHome: "/",
  urlRank: "/rank",
  urlRule: "/rule",
  urlContact: "/contact",
  ejsfile: './partials/play.ejs',
  msg: "4文字の半角英字を入力してくだい",
  content: [],
  content1: [],
  content2: [],
  lvl: 2,
}

router.get('/easy', function(req, res, next) {
  selectLv("2", req);
  renderData.lvl = 2;
  renderData.title = "easy | Word Hit & Blow";
  req.session.renderData = renderData;
  res.render('index', req.session.renderData);
});

router.get('/normal', function(req, res, next) {
  selectLv("1", req);
  renderData.lvl = 1;
  renderData.title = "normal | Word Hit & Blow";
  req.session.renderData = renderData;
  res.render('index', req.session.renderData);
});

router.get('/hard', function(req, res, next) {
  selectLv("0", req);
  renderData.lvl = 0;
  renderData.title = "hard | Word Hit & Blow";
  req.session.renderData = renderData;
  res.render('index', req.session.renderData);
});

// POST
router.post('/game', (req, res, next) => {
  var pre = req.body["predict"];
  req.session.wordAry = pre;
  console.log(pre);
  preAry = pre.split('');
  // 同じ文字確認
  for (var i = 0; i < preAry.length; i++) {
    for (var j = i + 1; j < preAry.length; j++) {
      if (preAry[i] == preAry[j]){
        req.session.renderData.msg = "同じ文字は使えません"
        res.render('index', req.session.renderData);
        return false;
      }
    }
  }
  // hit, blow
  var ansAry = req.session.answ;
  var hit = 0;
  var blow = 0;
  for (var i = 0; i < preAry.length; i++) {
    if (preAry[i] == ansAry[i]) {
      hit += 1;
    }
  }
  for (var i = 0; i < preAry.length; i++) {
    for (var j = 0; j < preAry.length; j++) {
      if (preAry[i] == ansAry[j]) {
        blow += 1;
      }
    }
  }
  blow -= hit;
  console.log(hit);
  console.log(blow);
  req.session.renderData.msg = "4文字の半角英字を入力してくだい";
  req.session.renderData.content.push(pre);
  req.session.renderData.content1.push(hit);
  req.session.renderData.content2.push(blow);
  // クリア処理, 継続処理
  if (hit == 4) {
    var hand = req.session.renderData.content.length;
    req.session.renderData.msg = hand;
    var lv = req.session.renderData.lvl;
    //DB接続
    db.pool.connect( async (err, client) => {
      if (err) {
        console.log(err);
      } else {
        var lowest;
        try {
          var result = await client.query("SELECT id, name, hands, level FROM rank WHERE level = $1 ORDER BY hands DESC", [lv]);
          console.log(result.rows);
          lowest = result.rows[0];
        } catch (err) {
          console.log(err.stack);
        }

        if (hand <= lowest.hands) {
          //ハイスコア更新
          try {
            client.query("DELETE FROM rank WHERE id = $1", [lowest.id]);
          } catch (err) {
            console.log(err.stack);
          }
          req.session.renderData.ejsfile = './partials/play_highscore.ejs';
          res.render('index', req.session.renderData);
        } else {
          //NOT更新
          req.session.renderData.ejsfile = './partials/play_clear.ejs';
          res.render('index', req.session.renderData);
          delete req.session.renderData;
        }
      }
    });
  } else {
    res.render('index', req.session.renderData);
  }
});

router.post('/game/clear', (req, res, next) => {
  var hand = req.session.renderData.msg;
  var lv = req.session.renderData.lvl;
  db.pool.connect( async (err, client) => {
    if (err) {
      console.log(err);
    } else {
      var userName = req.body['uName'];
      try {
        client.query("INSERT INTO rank (hands, name, level) VALUES ($1, $2, $3)", [hand, userName, lv]);
      } catch (err) {
        console.log(err.stack);
      }
    }
  });
  req.session.renderData.ejsfile = './partials/play_clear.ejs';
  res.render('index', req.session.renderData);
  delete req.session.renderData;
});

module.exports = router;

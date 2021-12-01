const express = require('express');
const app = express();
const bodyParser = require('body-parser');
app.use(express.urlencoded({extended: true})) 
require('dotenv').config()

const methodOverride = require('method-override')
app.use(methodOverride('_method'))
app.use('/public', express.static('public'));

const MongoClient = require('mongodb').MongoClient;
app.set('view engine', 'ejs');

let db;
MongoClient.connect(process.env.DB_URL, function(err, client){
  if(err) return console.log(err)
  db = client.db('todoapp')
})

app.listen(process.env.PORT, function(){
  console.log('welcome 8080')
})

app.get('/', function(req, res){
  res.render('index.ejs')
})

app.get('/write', function(req, res){
  console.log('user',req.user)
  res.render('write.ejs', { user : req.user})
})

app.get('/list', function(req, res){
  db.collection('newpost').find().toArray(function(err, result){
    result = result.sort((a,b)=>a._id - b._id)
    console.log(result)
    res.render('list.ejs', { posts : result })
  })
});



app.get('/detail/:id', function(req, res){
  // /뒤에 ':'을 입력하면 /뒤에 아무 내용이나 입력해도 이동하라는 명령
  // ':' 뒤에 붙은 id는 원하는 대로 작명 가능
  req.params.id = Number(req.params.id)
    db.collection('newpost').findOne({_id: req.params.id}, function(err, result){
        res.render('detail.ejs', { data : result })
    })
    // req이 들어오면 {}안에있는 데이터를 보내고 ejs파일을 렌더링
});

app.get('/edit/:id', function(req, res){
  req.params.id = Number(req.params.id)
    db.collection('newpost').findOne({_id: req.params.id}, function(err, result){
        res.render('edit.ejs', { data : result })
    })
});

app.put('/edit', function(req, res){
  let num = Number(req.body.id)
  db.collection('newpost').updateOne({_id: num}, { $set : {제목 : req.body.title, 날짜 : req.body.date}}, function(err, result){
    db.collection('newpost').findOne({_id: num}, function(err, result){
      res.redirect('/list')
      // res.send('result',result.제목)
    })
  });
})

const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy
const session = require('express-session')

app.use(session({secret : '비밀코드', resave : true, saveUninitialized: false}))
app.use(passport.initialize())
app.use(passport.session())

app.get('/login', function(req, res){
  res.render('login.ejs')
})

app.get('/join', function(req, res){
  res.render('join.ejs')
})

app.post('/login', passport.authenticate('local',{
  failureRedirect : '/fail'
}), function(req, res){
  res.redirect('/')
})

app.get('/mypage', 로그인했니, function(req, res){
  // 마이페이지로 접속 시  '로그인 했니' 사용자 미들웨어를 실행
  // passport.deserializeUser을 통해서 req.user에 유저정보 담김
  res.render('mypage.ejs', {사용자 : req.user})
})

function 로그인했니(req, res, next){
  if(req.user) {
    next()
    // req.user 이 있다면 next() (통과)
    // 로그인 후 세션이 있다면 req.user가 항상 있음
  } else {
    res.send('로그인이 필요합니다')
    // req.user 이 없다면 안내 (실패)
  }
}

passport.use(new LocalStrategy({
  usernameField: 'id',
  // 사용자가 제출한 아이디가 어디 적혔는지
  passwordField: 'pw',
  // 사용자가 제출한 비번이 어디 적혔는지
  session: true,
  // 세션을 만들건지 여부
  passReqToCallback: false,
  // 아이디/비번말고 다른 정보검사가 필요한지
}, function (입력한아이디, 입력한비번, done) {
  //console.log(입력한아이디, 입력한비번);
  db.collection('login').findOne({ id: 입력한아이디 }, function (err, result) {
    // 먼저 login 콜렉션에서 id에 해당되는 값 있는지 검색(아이디가 유니크한 값)
    if (err) return done(err)
    // err 발생 시에는 err를 리턴
    if (!result) return done(null, false, { message: '존재하지않는 아이디요' })
    // 일치하는 아이디가 없을 때

    if (입력한비번 == result.pw) {
    // 일치하는 아이디가 있고 비번이 같을 때   
      return done(null, result)
    } else {
    // 일치하는 아이디가 있고 비번이 다를 때  
      return done(null, false, { message: '비번틀렸어요' })
      // done 은 세가지의 파라미터를 가짐
      // done (서버err, 성공시 사용자 DB 데이터, err메세지)
    }
  })
}));

passport.serializeUser(function (user, done) {
  // user에는 return done(null, result)에서 반환 된 값이 저장
  done(null, user.id)
});
// id를 이용하여 세션을 저장시키는 코드 (로그인 성공 시 발동)
// 세션 데이터를 만들고 세션 id 정보를 쿠키로 보냄

passport.deserializeUser(function (아이디, done) {
  // 파라미터로 들어온 아이디는 passport.serializeUser에서 반환한 user.id
  db.collection('login').findOne({id : 아이디}, function(err, result){
    done(null, result)
    // result에는 id를 포함한 유저정보 전체가 담긴
  })
}); 
// 로그인한 유저의 세션아이디를 바탕으로 DB에서 찾기 (마이페이지 접속 시 발동)

app.post('/register', function(req, res){

  db.collection('login').insertOne( { id : req.body.id, pw : req.body.pw }, function(err, result){
      if(err){return console.log('err발생2')}
      res.redirect('/')
    })
});


app.post('/add', function(req, res){
  // 'req.user'에는 현재 로그인한 사람의 정보 들어있음

  db.collection('counter').findOne({name:'게시물갯수'}, function(err, result){
    if(req.user===undefined) {return res.render('login-need.ejs')}
    if(err) { return res.render('login-need.ejs')}
    let 총게시물갯수 = result.totalPost
    let post = { _id : 총게시물갯수 + 1 ,작성_id : req.user._id, 작성자 : req.user.id, 날짜 : req.body.date, 제목 : req.body.title}
    db.collection('newpost').insertOne(post, function(err, result){
      if(err){return res.render('login-need.ejs')}
      db.collection('counter').updateOne({name:'게시물갯수'},{$inc:{totalPost:1}},function(err,result){
        if(err){return res.render('login-need.ejs')}
        res.send('전송완료')
      })
    });
  })
})

app.delete('/delete', function(req, res){
  req.body._id = parseInt(req.body._id)
  let 삭제할데이터 = {_id : req.body._id, 작성_id : req.user._id}
  // 로그인중인 유저의 _id와 글의 저장된 유저의 _id가 일치시 삭제

  db.collection('newpost').deleteOne(삭제할데이터, function(err, result){
      // res.render('/list')
      res.status(200).send({ message : '성공했습니다'});
    // 삭제시 같이 실핼할 내용
  })
})

app.get('/search', (req, res)=>{

  let 검색조건 = [
    {
      $search: {
        index: 'titleSearch',
        text: {
          query: req.query.value,
          path: '제목'
        }
      }
    }
  ] 
  db.collection('newpost').aggregate(검색조건).toArray((err, result)=>{
    res.render('search.ejs', {posts : result})
  })
})


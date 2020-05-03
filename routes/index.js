var express = require('express');
var passport = require('passport');
const WebAppStrategy = require('ibmcloud-appid').WebAppStrategy
const userProfileManager = require("ibmcloud-appid").UserProfileManager;
var router = express.Router();
const postOrder = require('../api/submitOrder').postOrder;
const uuid = require('../util/uuid').getUUID;
//TODO: set limits and security features of multer
const multer = require('multer');
var upload = multer({ dest: 'uploads/' , limits:{fileSize:2*Math.pow(1024,2)}})

userProfileManager.init({
	tenantId: process.env["TENANT_ID"],
	clientId: process.env.CLIENT_ID,
	secret: process.env.APPID_SECRET,
	oauthServerUrl: process.env.OAUTH_SERVER_URL,
  redirectUri: process.env.SERVER_URL + "/login",
  profilesUrl:process.env.APPID_PROFILES_URL
});

var auth=passport.authenticate(WebAppStrategy.STRATEGY_NAME);

/* TODO: delete this on final code. Used to override when local /
auth= function(req, res, next) {
  next();
} // */

/* GET home page. */
router.get('/', (req,res)=>{
  res.render('index');
})
router.get('/home', auth, function(req, res, next) {
  res.render('home', { title: 'Órdenes de Exámenes Médicos' });
});

router.get('/pedido', auth, function(req,res,next) {
  var accessToken = req.session[WebAppStrategy.AUTH_CONTEXT].accessToken;
  userProfileManager.getUserInfo(accessToken).then((att) => {
    //console.debug("user attributes", att);
    res.render('pedido', { idPedido: uuid(), doctorName: att.name, doctorEmail: att.email })
  }).catch(err => {
    console.error(err)
    res.render('pedido', { idPedido: uuid() })
  });
  
})

router.post(
  '/pedido', 
  auth,
  upload.none(), 
  postOrder
)

router.post(
  '/pedidoPhotos', 
  auth, 
  upload.array('photoOrder', 4), 
  postOrder
)

module.exports = router;

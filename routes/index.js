var express = require('express');
var passport = require('passport');
const WebAppStrategy = require('ibmcloud-appid').WebAppStrategy
var router = express.Router();
const postOrder = require('../api/submitOrder').postOrder;


/* GET home page. */
router.get('/', (req,res)=>{
  res.render('index');
})
router.get('/home', passport.authenticate(WebAppStrategy.STRATEGY_NAME), function(req, res, next) {
  res.render('home', { title: 'Órdenes de Exámenes Médicos' });
});

router.get('/pedido', passport.authenticate(WebAppStrategy.STRATEGY_NAME), function(req,res,next) {
  res.render('pedido')
})

router.post('/pedido', passport.authenticate(WebAppStrategy.STRATEGY_NAME), postOrder)

module.exports = router;

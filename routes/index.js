var express = require('express');
var router = express.Router();
const postOrder = require('../api/submitOrder').postOrder;
const uuid = require('../util/uuid').getUUID;
const adminApi = require('../api/adminApi').adminApi;
//TODO: set limits and security features of multer
const multer = require('multer');
var upload = multer({ dest: 'uploads/' , limits:{fileSize:2*Math.pow(1024,2)}})


/* GET start page. */
router.get('/', (req,res)=>{
  res.render('index');
})


router.get('/favicon.ico', express.static("/images/favicon.ico"))

router.get("/webapp/home", (req, res) => {
  res.render('home');
})

router.get("/webapp/pedido", (req, res) => {
  res.render('pedido', {
    idPedido:uuid(), 
    doctorName:res.locals.userName, 
    doctorEmail:res.locals.userEmail
  })
})
router.post("/webapp/pedido", upload.none(), postOrder)
router.post("/webapp/pedidoPhotos", upload.array('photoOrder,4'), postOrder)

router.get("/admin/listadoOrdenes", (req, res) => {
  res.render('admin/listadoOrdenes')
});

router.get('/admin/abrirOrden', (req, res)=> {
  if (req.query.id) {
    adminApi.getOrderDetails(req.query.id).then(data => {
      res.render("admin/resumenPedido", {pedido:data})
    }).catch( err => {
      err.status=500
      throw err;
    })
  } else {
    throw new Error("Missing parameter");
  }
})

router.get('/admin/changeOrderStatus', (req,res)=>{
  var id = req.query.id;
  var user = res.locals.userName;
  adminApi.changeOrderStatus(id, user).then( body=> {
    console.debug("Modified doc", body);
    res.json(body)
  }).catch(err => {
    res.status(500).send(err.message)
  })
})
//TODO: Remove this 
router.get('/test/pedido', (req, res) => {
  res.render('pedido')
})

router.get('/adminapi/orderList', adminApi.getOrders)
router.get('/adminapi/getAttachment', adminApi.getOrderAttachment)


module.exports = router;

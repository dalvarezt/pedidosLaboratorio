'use strict';
const DB = require('../util/DB');
const fs = require('fs');
const mailer = require('../util/mailer')

const reportError = function (err, res) {
    console.error(err);
    res.status(500).send(err.message);
}

function addAtachmnet(file, db, id, rev) {
    console.debug("Rev:" + rev)
    return new Promise((resolve, reject) => {
        fs.readFile(file.path, (err,data) => {
            if(err) {
                console.error("Error reading file: "+file.path, err);
                reject(err);
                return;
            }
            db.attachment.insert(id, file.originalname, data, file.mimetype, {rev:rev})
            .then(body => {
                console.debug(body)
                fs.unlink(file.path, (err)=>{
                    console.error("Failed to delete file " + file.path, err)
                });
                resolve(body.rev)
            }).catch(err => {
                console.error("Error retrieving document with id: "+id, err);
                reject(err)
            })
        })
    })

}

function postOrder(req, res) {
    console.log("Connecting to database");
    DB.getConnection().then(db => {
        console.debug("Connected to database")
        // Build JSON document to send to database
        var doc = {};
        for (var k in req.body) {
            if (k != "photoOrder" && req.body[k] != "") {
                console.debug(k, req.body[k])
                var tags = k.split(".")
                if (!doc[tags[0]]) {
                    doc[tags[0]] = {};
                }
                if (req.body[k] instanceof Array) {
                    var fdata = []
                    for (var v of req.body[k]) {
                        if (v!="") {
                            fdata.push(v)
                        }
                    }
                    if (fdata.length>0) {
                        doc[tags[0]][tags[1]] = fdata
                    }
                } else if (req.body[k]!=""){
                    doc[tags[0]][tags[1]] = req.body[k]
                }
                

            }
        }
        // computed fields
        doc.pedido['timestamp'] = new Date().toJSON();
        doc.pedido['status'] = 'P';
        db.insert(doc).then(body => {
            console.log(body);
            if (req.files) {
                var id=body.id;
                var p = Promise.resolve();
                req.files.forEach( file => {
                    p = p
                    .then( rev => addAtachmnet(file, db, id, rev?rev:body.rev))
                    .catch(err => {
                        console.debug(err);
                        reportError(new Error("Ocurrió un error guardando uno o varios archivos"), res)
                        return
                    })
                })
            }

            if (req.url == "/webapp/pedido") {
                res.render("home", {'alertMessage':'Orden procesada correctamente, gracias por preferirnos'});
            } else {
                res.status(200).send("OK");
            }
            doc._id = body.id;
            mailer({ 
                to: process.env.NOTIFICATION_EMAIL, 
                from: process.env.NOTIFICATION_SENDER,
                subject: "Nueva orden de examenes recibida"
            }, "admin/mailNote.pug", {pedido:doc}).catch( err => console.error("Error sending mail", err))

        }).catch(err => { reportError(err, res) })



    }).catch(err => { reportError(err, res) })




}

module.exports.postOrder = postOrder;
'use strict';
const DB = require('../util/DB');
const fs = require('fs');

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
                var tags = k.split(".")
                if (!doc[tags[0]]) {
                    doc[tags[0]] = {};
                }
                doc[tags[0]][tags[1]] = req.body[k]

            }
        }
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

            if (req.url == "/pedido") {
                res.render("home", {'alertMessage':'Orden procesada correctamente, gracias por preferirnos'});
            } else {
                res.status(200).send("OK");
            }

        }).catch(err => { reportError(err, res) })



    }).catch(err => { reportError(err, res) })




}

module.exports.postOrder = postOrder;
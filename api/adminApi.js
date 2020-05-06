"use strict";
const DB = require("../util/DB.js");

/**
 * 
 * @typedef GetOrdersOptions
 * @property {boolean} [pendingOnly] - indicates if only pendint orders should be retrieved
 * @property {string} [fromDate] - Starting date filter
 * @property {string} [toDate] - 
 * 
 */

/** 
 * @typedef Order
 * @property {string} _id Document id
 * @property {Pedido} pedido
 * @property {Paciente} paciente
 * @property {Lab} lab
 * @property {Imagen} imagen
 * @property {Array} attachments
 */

/** 
 * @typedef Pedido 
 * @property {string} id Order id
 * @property {string} doctorEmail
 * @property {string} doctorName
 */


class AdminApi {


    /**
     * Retrieves a list of orders using options as filters
     * @param {Express.Request} req
     * @param {Express.Response} res
     */
    getOrders(req, res) {
        var viewName = "pedidosPorFecha";
        var opts = {
            descending: true,
            limit: 10
        };
        if (req.query.sortName) {
            switch (req.query.sortName) {
                case "value.nombreDoctor":
                    viewName = "pedidosPorDoctor";
                    break;
                case "value.estado":
                    viewName = "pedidosPorEstado";
                    break;
                case "value.nombrePaciente":
                    viewName = "pedidosPorPaciente";
                    break;
                default:
                    viewName = "pedidosPorFecha";
            }
        }
        if (req.query.sortOrder) {
            opts.descending = req.query.sortOrder === "desc";
        }
        if (req.query.pageSize && req.query.pageNumber) {
            opts.limit = parseInt(req.query.pageSize);
            opts.skip = (parseInt(req.query.pageNumber) - 1) * parseInt(req.query.pageSize)
        }
        if (req.query.searchText) {
            opts.keys = req.query.searchText.split(" ")
        }
        DB.getConnection().then(db => {
            db.view("adminViews", viewName, opts).then(data => {
                res.json(data)
            })
        })
    }

    /**
     * Changes the status of an order from pending to ready
     * @param {string} id The document id of the order
     * @param {string} user The id of the user executing the action
     * @param {boolean} status true=>ready, false=>pending
     */
    changeOrderStatus(id, user, status) {

    }

    /**
     * Retrieves the complete details of an order
     * @param {string} id The document id of the order
     * @promise
     * @fulfill {Order}
     * @reject {Error}
     * @returns {Promise.<Order>}
     */
    getOrderDetails(id) {
        return DB.getConnection().then(db => {
            return db.get(id)
        })
    }

    /**
     * Retrieves the readstream of a document attachment
     * @param {Express.Request} req 
     * @param {Express.Response} res
     * @throws AttachmentNotFound
     */
    getOrderAttachment(req, res) {
        if (!req.query.id || !req.query.attachment) {
            res.status(405).send("Missing paramenters");
            return;
        }
        const id = req.query.id;
        const attName = req.query.attachment;
        DB.getConnection().then(db => {
            db.get(id).then(doc => {
                if (!doc._attachments[attName]) {
                    return Promise.reject(new Error("Attachment not found: " + attName))
                }
                const attData = doc._attachments[attName];
                res.type(attData.content_type);
                db.attachment.getAsStream(id, attName).pipe(res)
            }).catch(err => {
                res.status(404).send(err.message)
            })

        })

    }
}

module.exports.adminApi = new AdminApi();
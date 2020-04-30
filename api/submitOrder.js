
function postOrder(req, res) {
    console.debug("form received", req.body);
    res.redirect(200, "/home")
}

module.exports.postOrder = postOrder;
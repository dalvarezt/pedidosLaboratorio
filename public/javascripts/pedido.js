'use strict';
var photoCollection=null;

/**
 * Generates a 16char unique id
 * @returns {string}
 */
function getUID() {
    const uint32 = window.crypto.getRandomValues(new Uint32Array(1))[0];
    return uint32.toString(16);
}

/**
 * Performs Bootstrap's form validation and if passes, shows a confirmation dialog
 * for the user to cofirm a submission
 * @param {Form} form The form being submitted
 * @param {function} cb A callback function
 */
function validateConfirmSumbit(form, cb) {
    //var form = e.target;
    if (form.checkValidity()) {
        bootbox.confirm( {
            message:"Está seguro de continuar con el envío?",
            buttons: {
                confirm: {
                    label:"Aceptar",
                    className: "btn-primary"
    
                },
                cancel:{
                    label:"Cancelar",
                    className:"btn-secondary"
                }
            },
            callback:cb
        })
    } else {
        form.classList.add('was-validated')
        cb(false)
    }
}

/* Photo upload - prepare input type=file */

class PhotoCollection {
    MAX_COUNT = 4;
    FILE_INPUT_ID = "imagenOrden";
    FORM_ID = "formPedido";
    INPUT_BUTTON_ID = "imagenOrdenBtn"
    ALERT_CONTAINER_ID = "photoAlerts"
    CANVAS_CONTAINER_ID = "photoCanvas"
    ALERTS = { ERROR:"danger", WARNING:"warning", INFO:"success"}


    constructor() {
        this.photos=new Map();
        this.fileInput = $(`#${this.FILE_INPUT_ID}`)
        this.fileButton = $(`#${this.INPUT_BUTTON_ID}`)
        this.isDisabled = false;
        this.fileInput.on('change', this.fileInputChange.bind(this))
        $(document).on('remove-photo', this.removePhoto.bind(this))
        $(`#${this.FORM_ID}`).on("submit", this.formSumbitHandler.bind(this))
    }

    formSumbitHandler(e) {
        e.preventDefault();
        var form = e.target; 
        validateConfirmSumbit(form, result => {
            if(result) {
                if(this.photos.size>0) {
                    var formData = new FormData(form);
                    var promises = [];
                    this.photos.forEach( (photo) => {
                        promises.push( photo.getUploadData().then(photoData => {
                            formData.append("photoOrder", photoData, photo.file.name)
                        }))
                    })
                    Promise.all(promises).then( () => {
                        formData.delete(this.FILE_INPUT_ID)
                        
                        $('#uploadingModal').modal('show')
                        let request = new XMLHttpRequest();
                        request.addEventListener("load", (event) =>{
                            var res = event.target;
                            if (res.status!=200) {
                                $('#uploadingModal').modal('hide');
                                this.showAlert("Ocurrió un error enviando orden. Por favor espere un momento y vuelva a intentar", this.ALERTS.ERROR)
                                console.log(res.response)
                            } else {
                                window.location.replace("./home")
                            }
                        })
                        request.addEventListener("error",(e) => {
                            $('#uploadingModal').modal('hide')
                            bootbox.alert("Ocurrió un error cargando la orden")
                            console.log(e.message);
                        })
                        request.open('POST','pedidoPhotos');
                        request.send(formData);
        
                    })
                } else {
                    form.submit();
                }
            } 
        })

    }

    fileInputChange(e) {
        var file = e.target.files[0];
        if (file) {
            if (/^image\//i.test(file.type)) {
                this.addPhoto(file)
            } else {
                this.showAlert('Archivo de imagen inválido', this.ALERTS.ERROR);
            }
            this.fileInput.value="";
        }
    }

    addPhoto(file) {
        try {
            var photo = new Photo(file);
            this.photos.set(photo.fileID, photo)
            if (this.photos.size==4) {
                this.disableFileInput();
            }
            $(`#${this.CANVAS_CONTAINER_ID}`).append(
                `<div class="photo-container" id="${photo.fileID}"> \
                    <div class="photo-overlay d-inline-flex"> \
                        <button class="btn btn-dark bmd-btn-fab bmd-btn-fab-sm" onclick="$(document).trigger('remove-photo', '${photo.fileID}')"> \
                            <i class="material-icons">delete</i> \
                        </button>
                    </div>
                </div>`
            )
            photo.getThumbnailCanvas().then( canvas => {
                canvas.setAttribute("class", "photo-canvas")
                $(`#${photo.fileID}`).prepend(canvas);
            }).catch(err=>{
                this.showAlert("Ocurrió un error procesando su archivo. Por favor intente nuevamente", this.ALERTS.ERROR)
                console.error(err); 
            });
            
        } catch(err) {
            this.showAlert("Ocurrió un error procesando su archivo. Por favor intente nuevamente", this.ALERTS.ERROR)
            console.error(err);
        }
    }

    removePhoto(e, photoId) {
        this.photos.delete(photoId)
        $(`#${photoId}`).remove()
        if (this.isDisabled) {
            this.enableFileInput();
        }
    }

    disableFileInput() {
        this.isDisabled = true
        this.fileInput.prop("disabled",true)
        this.fileButton.prop("disabled", true)
    }

    enableFileInput() {
        this.fileInput.prop("disabled", false)
        this.fileButton.prop("disabled", false)
        this.isDisabled = false
    }

    showAlert(msg, level) {
        var lvl = (level ? level : this.ALERTS.WARNING)
        var id = getUID()
        $(`#${this.ALERT_CONTAINER_ID}`).html(
            '<div class="alert alert-' + lvl + ' alert-dismissible id="' + id +'">'+
            msg +
            '<a href="#" class="close" data-dismiss="alert" aria-label="cerrar">&times;</a>' +
            '</div>'
        )
        setTimeout(()=>{
            $(`#${id}`).hide();
        }, 15000)
    }


}

class Photo {
    THUMBNAIL_SIZE=150;
    UPLOAD_SIZE=2048;

    constructor(file) {
        this.fileID = getUID();
        this.file = file;
        this.fileData = null;
    }

    /**
     * Returns an image object from the file read
     * @async
     * @private
     * @returns {Promise}
     */
    _getImage() {
        return new Promise( async (resolve, reject) => {
            const fr = new FileReader();
            fr.onloadend = () => { 
                var image = new Image();
                image.src = fr.result;
                image.onload = () => {
                    resolve(image)
                }
                image.onerror = (err) => {
                    reject(err);
                }
             }
            fr.onerror = (err) => { reject(err); }
            fr.readAsDataURL(this.file);
        });
    }

    _getResizedDimensions(width, height, maxLength) {
        var newWidth;
		var newHeight;

		if (width > height) {
			newHeight = height * (maxLength / width);
			newWidth = maxLength;
		} else {
			newWidth = width * (maxLength / height);
			newHeight = maxLength;
        }
        return {"width":newWidth, "height":newHeight}
    }

    /**
     * Returns a canvas object with the photo rendered on it
     * @param {number} maxLength The maximum width/height of the canvas
     * @private
     * @returns {Canvas}
     */
    async _getCanvas(maxLength) {
        if(!this.image) {
            this.image = await this._getImage()
                .then( img => { return img })
                .catch(err => { throw err})
        }
        var width = this.image.width;
        var height = this.image.height;
        
		var newWidth;
		var newHeight;

		if (width > height) {
			newHeight = height * (maxLength / width);
			newWidth = maxLength;
		} else {
			newWidth = width * (maxLength / height);
			newHeight = maxLength;
		}

		var canvas = document.createElement('canvas');

		canvas.width = newWidth;
		canvas.height = newHeight;

		var context = canvas.getContext('2d');

		context.drawImage(this.image, 0, 0, newWidth, newHeight);
        return canvas;    
    }
    
    getThumbnailImage(){
        return new Promise( (resolve, reject) => {
            this._getImage().then( img=> {
                var dim = this._getResizedDimensions(img.width, img.height, this.THUMBNAIL_SIZE);
                img.setAttribute("width", dim.width);
                img.setAttribute("heigth", dim.height);
                resolve(img);
            }).catch(err => {reject(err)});
        })
    }

    getThumbnailCanvas() {
        return this._getCanvas(this.THUMBNAIL_SIZE)
    }

    getUploadData() {
        var fileType = this.file.type;
        return this._getCanvas(this.UPLOAD_SIZE).then( canvas => {
            return new Promise( (resolve) => {
                canvas.toBlob(resolve, fileType)
            }) 
        })
    }
}



/*
 * Initialize photo conllection on window load event
 */

(() => {
    window.addEventListener('load', () => {
        if (window.File && window.FileReader && window.FormData) {
            photoCollection = new PhotoCollection();
        } else {
            console.log("File upload is not supported!");
            $('#foto').html("<div class='alert alert-warning'>Captura de imagenes no soportada en este dispositivo</div>")
            $('#formPedido').on("submit", (event) => {
                event.preventDefault()
                validateConfirmSumbit(event.currentTargeet, result => {
                    if (result) {
                        event.currentTargeet.submit();
                    }
                })
            })
        }
    });
})();


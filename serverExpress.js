'use strict'
const fs = require('fs')

/*
DEPENDENCIES
*/
const express = require('express')
const chalk =require('chalk');
const bodyParser = require('body-parser');
const cors = require('cors');
/*
END
*/

const app = express()
const port = 3000

let jsonParser = bodyParser.json();
let productos = JSON.parse(fs.readFileSync('productos.json'));
let usuarios = JSON.parse(fs.readFileSync('usuarios.json'));
//APP.USE ES MIDDLEWARE
let corsOptions ={
    origin:'*'
}
app.use(cors(corsOptions));
app.use(jsonParser);
app.use(datosSolicitud);
app.route('/api/v1/producto')
    .get((req, res) => {
        if(req.query.marca){
            //res.json(alumnos);
            const patt = new RegExp(req.query.marca);
            const productos_found = productos.filter(item => {
            if (patt.test(item.marca)) {
                return true;
            }
            });
            res.json(productos_found);
            console.log(chalk.bold.green.inverse(req.query.marca));
        }else{
            res.json(productos);
        }
    })
    .post(checkToken,(req,res)=>{
        let body=req.body;
        body.id=productos[productos.length-1].id +1;
        if(body.nombre && body.marca && body.precio && body.descripcion && body.existencia){
            //TODO revisar que no exista el id
            productos.push(body);
            fs.writeFileSync('productos.json',JSON.stringify(productos));
            console.log(chalk.blue(body));
            res.status(201).send(body);
            return;
        }
        res.status(400).send({error:"Faltan atributos en el body"});
    });
app.route('/api/v1/producto/:id')
    .get(producto_existe,(req,res)=>{
        let id = req.params.id;
        let producto = productos.find(al=> al.id==id);
        if(producto){
            res.json(producto);
            return;
        }
        res.json({error:"no existe"});
    })
    .patch(checkToken,producto_existe,(req,res)=>{
        let id= req.params.id;
        let pos = productos.findIndex(item=> item.id==id);
        let body = req.body;
            /*productos[pos].nombre = (body.nombre)? body.nombre: productos[pos].nombre;
            productos[pos].marca = (body.marca)? body.marca: productos[pos].marca;
            productos[pos].precio = (body.precio)? body.precio: productos[pos].precio;
            productos[pos].description = (body.description)? body.description: productos[pos].description;
            productos[pos].existencia = (body.marca)? body.existencia: productos[pos].existencia;*/
            Object.assign(productos[pos],body);
            fs.writeFileSync('productos.json',JSON.stringify(productos));
            res.status(200).send(productos[pos]);
    });

app.route('/api/v1/usuario/login')
    .post((req,res)=>{
        let body=req.body;
        if(body.usuario && body.password){
            if(body.password.length<=5){
                res.status(400).send({error:"contraseña min 6 caracteres"});
                return;
            }
            let pos = usuarios.findIndex(user=>{
                if(user.usuario==body.usuario && user.password==body.password){
                    return true;
                }
            });
            if(pos>=0){
                //si existe
                let token= generate_token();
                usuarios[pos].token=token;
                usuarios[pos].token_created_at=new Date();
                fs.writeFileSync('usuarios.json',JSON.stringify(usuarios));
                res.setHeader('x-auth',token);
                res.status(200).send({body:req.body.usuario});
                return;
            }
            res.status(406).send({error:"usuario y/o contraseña incorrectos"});
            return;
        }
        res.status(400).send({error:"Faltan atributos en el body"});
        
    });
 app.route('/api/v1/usuario/logout')
    .post(checkToken,(req,res)=>{
        let user=req.header('x-user');
        let pos = usuarios.findIndex(item=>{
            if(item.usuario==user){
                return true;
            }
        });
        usuarios[pos].token="";
        usuarios[pos].token_created_at=new Date(Date.now() - 864e5);
        fs.writeFileSync('usuarios.json',JSON.stringify(usuarios));
        res.status(200).send();
        return;
    });


//MIDLEWARES///
function datosSolicitud(req,res,next){
    console.log('METHOD:',chalk.bold.blue(req.method));
    console.log('Content-Type:',chalk.bold.blue(req.header('Content-Type')));
    console.log('x-auth:',chalk.bold.blue(req.header('x-auth')));
    console.log('url:',chalk.bold.blue(req.hostname+req.originalUrl));
    let date = new Date();
    console.log('fecha:',chalk.bold.blue(date));
    console.log('solicitud',chalk.bold.blue(req.body));
    next();
}
function producto_existe(req,res,next){
    let id= req.params.id;
    let pos = productos.findIndex(al=> al.id==id);
        if(pos==-1){
            res.status(404).send({information:"Id no existe"});
            return;
        }
    next();
};
function checkToken(req,res,next){
    if(req.header('x-auth') && req.header('x-user')){
        let token=req.header('x-auth');
        let user=req.header('x-user');
        let pos = usuarios.findIndex(item=>{
            if(item.usuario==user && item.token==token){
                return true;
            }
        });
        if(pos<0){
            res.status(401).send({information:"No estas autorizado"});
            return;
        }
        ///check if token is still valid//
        let date=new Date();
        let miliseconds=date - new Date(usuarios[pos].token_created_at);
        if(Math.floor(miliseconds / 60000)<=5){
            ////TOKEN VALIDO NO MAYOR A 5 MIN
            next();
        }
        res.status(401).send({information:"token expirado"});
        return;
    }else{
        res.status(401).send({information:"No cuentas con token de autorizacion"});
        return;
    }
}

///FUNCTIONS///
function generate_token(){
    return Math.random().toString(36).substr(2, 10);
}


//LISTEN APP//    
app.listen(port, () => console.log(`Example app listening on port ${port}!`));


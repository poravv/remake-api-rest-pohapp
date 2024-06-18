const express = require('express')
const app = express()
const database = require('./database')
const rutas = require('./config_rutas')
const port = process.env.PORT||3000;
const cors = require('cors')



app.use(cors());/*aplica permiso para todos los origenes*/

/*Filtramos los origenes que se pueden conectar*/
//const siteList = ['http://localhost:3000','https://pohapp-web.onrender.com/']
//app.use(cors({origin:siteList}));

const conecta= async()=>{
try {
    database.authenticate()
    console.log("Base de datos conectada");
} catch (error) { 
    console.log("Error: ",error)
}
}
 
conecta()

app.use(express.urlencoded({limit: '50mb',extended:false}));
app.use(express.json({limit: '50mb',extended: true, parameterLimit:500000}));

app.use(rutas)


app.get('/',(_req,res)=>{
res.send("Api rest Poha ÑanApp")
})



app.listen(port,()=>{
    console.log("App corriendo en el puerto: ",port)
})
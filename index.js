require("dotenv").config()
let log = console.log
const express = require("express")
const route = express.Router()
const app = express()
const cors = require("cors")
const bcrypt = require("bcrypt")
const mongo = require("mongoose")
const jwt = require("jsonwebtoken")

mongo.connect(process.env.uri).then(()=>{
    console.log("Database connected")
})

const db = mongo.connection
let Users = db.collection("Users")
let History = db.collection("History")

app.use(express.json())
app.use(cors({
    origin:"https://weather-forecastss.netlify.app",
    credentials: true
}))

let port = 2000

route.post("/", (req, res)=>{
    return res.send("Connected bitch!!")
})

route.post("/searchPlace", async(req, res)=>{
    let place = req.body.place
    let data = req.body.date
    if(place){
        let response = await fetch(`http://api.weatherapi.com/v1/search.json?q=${encodeURIComponent(place)}&key=${process.env.key}`,{
            method:"GET"
        }).then(async(e)=>{
            let json = await e.json()
            let regions = []
            for(let i =0;i<json.length;i++){
                regions.push([json[i].name, json[i].region, json[i].country])
            }
            return res.send(regions)
        }).catch(async(e)=>{
            return res.send(`${e}`)
        })
    }
})

route.post("/getWeather", async(req, res)=>{
    let input = req.body.quest
    if(input){
        let response = await fetch(`http://api.weatherapi.com/v1/current.json?q=${encodeURIComponent(input)}&key=${process.env.key}`, {
            method:"POST"
        }).then(async(e)=>{
            let json = await e.json()
            return res.json(json)
        }).catch(async(e)=>{
            return res.json(e)
        })
    }
})

route.post("/weatherHistory", async(req, res)=>{
    let input = req.body.q
    if(input){
        if(req.body.time == "today"){
            let response = await fetch(`http://api.weatherapi.com/v1/history.json?q=${encodeURIComponent(input)}&key=${process.env.key}&dt=${new Date().toISOString().split('T')[0]}`,{
                method:"POST"
            }).then(async(e)=>{
                let json = await e.json()
                return res.json(json.forecast.forecastday[0].hour)
            }).catch(async(e)=>{
                return res.json(e)
            })
        }
    }
})

route.post("/createAccount", async(req, res)=>{
    let {name, email, password} = req.body
    let finder = await Users.find({"email":email})
    res.header('Access-Control-Allow-Origin', 'http://localhost:5173')
    res.header('Access-Control-Allow-Methods', 'POST'); 
  res.header('Access-Control-Allow-Headers', 'Content-Type'); 
  res.header('Access-Control-Allow-Credentials', true); 
    if(finder){
        let salt = await bcrypt.genSalt(10)
        let hash = await bcrypt.hash(password, salt)
        Users.insertOne({"name":name, "email":email, "password":hash})
        return res.json({"status":"1"})
    }else{
        return res.json({"error":"email"})
    }
})

route.post("/signin", async(req, res)=>{
    let {email, password} = req.body
    let finder = await Users.findOne({"email":email})
    if(finder){
        let checker = await bcrypt.compare(password, finder.password)
        if(checker){
            let t = await jwt.sign({id:finder._id}, process.env.secret)
            res.json({"token":t})
        }else{
            res.json({"status":"password"})
        }
    }else{
        res.json({"status":"email"})
    }
})

route.post("/store", async(req, res)=>{
    let user = jwt.verify(req.body.token, process.env.secret)
    if(user){
        let finder = await History.findOne({"user":user.id})
        if(finder){
            let newSet = finder.place
            newSet.push(req.body.place)
            History.updateOne({"user":user.id}, {$set:{"place":Array.from(new Set(newSet))}})
        }else{
            History.insertOne({place:[req.body.place], user:user.id})
        }
        return res.json({"status":"success"})
    }else{
        return res.json({"status":"token"})
    }
})

route.post("/getHistory", async(req, res)=>{
    let user = jwt.verify(req.body.id, process.env.secret)
    let finder = await History.findOne({"user":user.id})
    if(user){
        if(finder){
            return res.json({data:finder.place})
        }else{
            return res.json({"status":"Not found"})
        }
    }
    return res.json({"error":"id"})
})

route.post("/delHistory", async(req, res)=>{
    let user = jwt.verify(req.body.id, process.env.secret)
    let finder = await History.findOne({"user" : user.id})
    if(finder){
        let newSet = new Set(finder.place)
        if(newSet.has(req.body.place)){
        }
        newSet.delete(req.body.place.item)
        History.updateOne({"user":user.id}, {$set:{place:newSet}})
        res.json({"success":"true"})
    }else{
        res.json({"error":"place"})
    }
})

app.use(route)

app.listen(port, ()=>{
    log("Successfully connected at", port)
})

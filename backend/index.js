const Y = require("yjs");
const { fromUint8Array, toUint8Array } = require('js-base64');

const express = require("express");
const session = require("express-session");
const app = express();
const PORT = 80;
const cors = require("cors");
const corsOptions = {
	origin: ["http://209.151.151.176", "http://coolkids.cse356.compas.cs.stonybrook.edu:3000", "http://coolkids.cse356.compas.cs.stonybrook.edu"],
	credentials: true,
	optionSuccessStatus: 200,
};
app.use(session({
    secret: "secret key",
    resave: false,
    saveUninitialized: false,
    cookie: { sameSite: false }
}));

app.set("view engine", "ejs");

var amqp = require('amqplib');
const { v4: uuidv4 } = require('uuid');
const queue = "mail";
let connection;
let channel;

(async () => {
    connection = await amqp.connect('amqp://localhost/');
    channel = await connection.createChannel();
    await channel.assertQueue(queue);
})();

const mongoose = require("mongoose");
const UserModel = require("./models/User");
const DocumentModel = require("./models/Document");
const mongoHost = "mongodb://localhost:27017/Docs";
mongoose.connect(mongoHost, { useNewUrlParser: true, useUnifiedTopology: true }).then((res) => { console.log("Mongo connected"); });

const multer  = require("multer")
const fs = require("fs");
const upload = multer({ dest: "uploads/" })

const EventEmitter = require('events');
const eventEmitter = new EventEmitter();
eventEmitter.setMaxListeners(100);

app.use(cors(corsOptions));
app.use(express.json({limit: '50mb'}));
app.use(express.static('/UwUntu/edit/build'))

let idArray = [];
let docArray = [];
let cursorArrays = [];

app.get("/api/connect/:id", async (req, res) => {
	if (req.session.isAuth) {
        let id = req.params.id;
        //console.log("Connected from " + id)

        if (!docArray[id]) {
            docArray[id] = new Y.Doc();
            cursorArrays[id] = [];
        }

        res.set({
            "Cache-Control": "no-cache",
            "Content-Type": "text/event-stream",
            Connection: "keep-alive",
        });
        res.flushHeaders();

        //console.log("Sync ");
        //console.log(fromUint8Array(Y.encodeStateAsUpdate(docArray[id])))
        //console.log(docArray[id].getText().toString())

        res.write("event: " + "sync" + "\n");
        res.write(`data: ${JSON.stringify({ update: fromUint8Array(Y.encodeStateAsUpdate(docArray[id])), id: idArray[req.params.id] })}\n\n`);

        for (let key  in cursorArrays[id]) {
            let cursor = cursorArrays[id][key];
            res.write("event: " + "presence" + "\n");
            res.write(`data: ${JSON.stringify({ session_id: cursor.session_id, name: cursor.name, cursor: { index: cursor.index, length: cursor.length } })}\n\n`);
        }

        docArray[id].on("update", (update) => {
            res.write("event: " + "update" + "\n");
            res.write(`data: ${JSON.stringify({ update: fromUint8Array(update), id: idArray[id] })}\n\n`);
        });

        eventEmitter.on("presence", (remoteId, index, length, name, sessionId) => {
            if (remoteId === id) {
                res.write("event: " + "presence" + "\n");
                res.write(`data: ${JSON.stringify({ session_id: sessionId, name: name, cursor: { index: index, length: length } })}\n\n`);
            }
        });

        res.socket.on('end', e => {
            //console.log("Disconnected")
            res.end();
        });
    } else 
        return res.send({ error: true, message: "Not logged in"});
});

app.post("/api/op/:id", async (req, res) => {
	if (req.session.isAuth) {
        let id = req.params.id;
        let data = req.body;

        idArray[id] = data.id;
        Y.applyUpdate(docArray[id], toUint8Array(data.update));

        let document = await DocumentModel.findOne({ id: id });
        document.dateModified = Date.now();
        await document.save();

        //console.log(document.name);
        //Y.logUpdate(toUint8Array(data.update));
        //console.log(docArray[id].getText().toString())
        //console.log('------------------------------------------------');

        return res.status(200).send();
    }

    return res.send({ error: true, message: "Not logged in"});
});

app.post("/api/presence/:id", async (req, res) => {
	if (req.session.isAuth) {
        let id = req.params.id;

        const user = await UserModel.findOne({ sessionId: req.session.id });

        cursorArrays[id][req.session.id] = {
            session_id: req.session.id,
            name: user.name,
            index: req.body.index,
            length: req.body.length
        };

        eventEmitter.emit("presence", id, req.body.index, req.body.length, user.name, req.session.id);
        return res.status(200).send();
    }

    return res.send({ error: true, message: "Must be logged in"});
});

app.get("/edit/:id", (req, res) => {
    if (req.session.isAuth)
        return res.sendFile("/UwUntu/edit/build/index.html");
    
    return res.send({ error: true, message: "Must be logged in"});
})

app.get("/home", (req, res) => {
    res.setHeader("X-CSE356", "6307790b58d8bb3ef7f6ceda");

    if (req.session.isAuth)
        return res.render("Home")

    return res.send({ error: true, message: "Must be logged in"});
});

app.get("/login", (req, res) => {
    res.render("Login");
});

app.get("/register", (req, res) => {
    res.render("Register");
});

app.get("/library/crdt.js", (req, res) => {
    res.setHeader("X-CSE356", "6307790b58d8bb3ef7f6ceda");
    res.sendFile("/UwUntu/example-crdt/dist/crdt.js");
});

/* app.get("/", (req, res) => {
    res.sendFile("/UwUntu/frontend/build/index.html");
}); */

////////////////// Users //////////////////
let keys = [];

app.post("/users/signup", async (req, res) => {
	const { name, password, email } = req.body;

    if (name != "" && password != "" && email != "") {
        let user = await UserModel.findOne({ email });

        if (user) return res.send({ error: true, message: "User already exists"});
    
        user = new UserModel({
            name,
            password,
            email,
            verified: false,
        });
    
        await user.save();

        const key = uuidv4();
        keys.push(key);

        channel.sendToQueue(queue, Buffer.from(JSON.stringify({
            email: email,
            key: key
        })));

        return res.send({ status: "OK"});
    }

    return res.send({ error: true, message: "One or more fields missing"});
});

app.post("/users/login", async (req, res) => {
	const { email, password } = req.body;
    const user = await UserModel.findOne({ email });

    if (!user || password != user.password || user.verified == false) return res.send({ error: true, message: "Cannot find user, password is incorrect, or not verified"});

    user.sessionId = req.session.id;
    await user.save();
    req.session.isAuth = true;
    return res.send({ name: user.name });
});

//Terminate event streams
app.post("/users/logout", (req, res) => {
	if (req.session.isAuth) {
        req.session.destroy((err) => {
            if (err) return res.send({ error: true, message: ""});

            return res.send();
        })
    } 
    else
        return res.send({ error: true, message: "Not logged in"});
});

app.get("/users/verify", async (req, res) => {
	const email = req.query.email;
    const key = req.query.key;
    
    for (i = 0; i < keys.length; i++) {
        if (keys[i] == key) {
            keys.splice(i, 1);
            await UserModel.updateOne({ email: email }, { verified: true });
            return res.send({
                status: "OK",
                email: email,
                key: key
            });	
        }
    }
        
    return res.send({ error: true, message: "Expired link"});
});

app.get("/users/loggedIn", (req, res) => {
    if (req.session.isAuth)
        return res.send({ id: req.session.id });
    
    return res.status(201).send();
});

////////////////// Collection //////////////////

app.post("/collection/create", async (req, res) => {
	if (req.session.isAuth) {
        let id = Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
        
        const document = new DocumentModel({
            name: req.body.name,
            id: id,
            dateModified: Date.now()
        });

        await document.save();
        return res.send({ id: id });
    }

    return res.send({ error: true, message: "Must be logged in"});
});

app.post("/collection/delete", async (req, res) => {
	if (req.session.isAuth) {
        await DocumentModel.deleteOne({ id: req.body.id });
        return res.send();
    }

    return res.send({ error: true, message: "Must be logged in"});
});

app.get("/collection/list", async (req, res) => {
	if (req.session.isAuth) {
        const list = await DocumentModel.find({ });
        
        for (let i = 0; i < list.length - 1; i++) {
            let max = i;
            for (let j = i + 1; j < list.length; j++) {
                if (list[j].dateModified > list[max].dateModified)
                    max = j;
            }

            let temp = list[max];
            list.splice(max, 1, list[i]);
            list.splice(i, 1, temp);
        }

        let newList = [];

        for (let i = 0; i < 10 && i < list.length; i++)
            newList.push({ id: list[i].id, name: list[i].name });

        return res.send(newList);
    }

    return res.send({ error: true, message: "Must be logged in"});
});

////////////////// Media //////////////////

app.post("/media/upload", upload.single('file'), (req, res) => {
    if (req.session.isAuth) {
        if (req.file.originalname.slice(-5) === ".jpeg") {
            let id = Date.now();
            let targetPath = `/UwUntu/backend/uploads/${id}.jpeg`;
            fs.rename(req.file.path, targetPath, () => {
                return res.send({ mediaid: id});
            })
        } else if (req.file.originalname.slice(-4) === ".jpg") {
            let id = Date.now();
            let targetPath = `/UwUntu/backend/uploads/${id}.jpg`;
            fs.rename(req.file.path, targetPath, () => {
                return res.send({ mediaid: id});
            })
        } else if (req.file.originalname.slice(-4) === ".png") {
            let id = Date.now();
            let targetPath = `/UwUntu/backend/uploads/${id}.png`;
            fs.rename(req.file.path, targetPath, () => {
                return res.send({ mediaid: id});
            })
        } else
            return res.send({ error: true, message: "Invalid file"});
    } else 
        return res.send({ error: true, message: "Must be logged in"});
});

app.get("/media/access/:mediaid", (req, res) => {
	if (req.session.isAuth) {
        let id = req.params.mediaid;
        if (fs.existsSync(`/UwUntu/backend/uploads/${id}.png`))
            return res.sendFile(`/UwUntu/backend/uploads/${id}.png`)
        else if (fs.existsSync(`/UwUntu/backend/uploads/${id}.jpeg`))
            return res.sendFile(`/UwUntu/backend/uploads/${id}.jpeg`)
        else if (fs.existsSync(`/UwUntu/backend/uploads/${id}.jpg`))
            return res.sendFile(`/UwUntu/backend/uploads/${id}.jpg`)
        else
            return res.status(404).send();
    }
    
    return res.send({ error: true, message: "Must be logged in"});
});

app.listen(PORT, () => console.log(`Ready on http://209.151.151.176:${PORT}`));

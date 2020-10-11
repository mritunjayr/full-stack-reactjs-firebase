const functions = require("firebase-functions");
const admin = require("firebase-admin");
const app = require("express")();

const firebase = require("firebase");
const { user } = require("firebase-functions/lib/providers/auth");

// Your web app's Firebase configuration
var firebaseConfig = {
  apiKey: "AIzaSyBAlCtU0XwR1QyLeg-tdcuhQR_Xv9J3Wx8",
  authDomain: "react-learn-55792.firebaseapp.com",
  databaseURL: "https://react-learn-55792.firebaseio.com",
  projectId: "react-learn-55792",
  storageBucket: "react-learn-55792.appspot.com",
  messagingSenderId: "681884745846",
  appId: "1:681884745846:web:208ee060dcdee6ff4adf57",
};

admin.initializeApp();
firebase.initializeApp(firebaseConfig);

const db = admin.firestore();
// get all posts by recent date
app.get("/screams", (req, res) => {
  db.collection("screams")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let screams = [];
      data.forEach((doc) => {
        screams.push({
          screamId: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
        });
      });
      return res.json(screams);
    })
    .catch((err) => {
      console.error(err);
    });
});

app.post("/scream", (req, res) => {
  const newScream = {
    body: req.body.body,
    userHandle: req.body.userHandle,
    createdAt: new Date().toISOString(),
  };

  db.collection("screams")
    .add(newScream)
    .then((doc) => {
      res.json({ message: `document ${doc.id} created successfully` });
    })
    .catch((err) => {
      res.status(500).json({ error: "something went wrong" });
      console.error(err);
    });
});

const isEmail = (email) => {
  return true;
};

const isEmpty = (string) => {
  if (string.trim() === "") {
    return true;
  } else {
    return false;
  }
};
// Signup route
app.post("/signup", (req, res) => {
  const newUser = {
    email: req.body.email,
    password: req.body.password,
    confirmPassword: req.body.confirmPassword,
    handle: req.body.handle,
  };

  let errors = {};
  if (isEmpty(newUser.email)) {
    errors.email = "Must not be empty";
  } else if (!isEmail(newUser.email)) {
    errors.email = "Must be valid email address";
  }

  if (isEmpty(newUser.password)) {
    errors.password = "Must not be empty";
  }
  if (newUser.password !== newUser.confirmPassword)
    errors.confirmPassword = "Password must match";
  if (isEmpty(newUser.handle)) {
    errors.handle = "Must not be empty";
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).json(errors);
  }
  // TODO: validate data
  let token, userId;
  db.doc(`/users/${newUser.handle}`)
    .get()
    .then((doc) => {
      if (doc.exists) {
        return res.status(400).json({ handle: "this handle is already taken" });
      } else {
        return firebase
          .auth()
          .createUserWithEmailAndPassword(newUser.email, newUser.password);
      }
    })
    .then((data) => {
      userId = data.user.uid;
      return data.user.getIdToken();
    })
    .then((IdToken) => {
      token = IdToken;
      const userCredentials = {
        handle: newUser.handle,
        email: newUser.email,
        createdAt: new Date().toISOString(),
        userId,
      };
      return db.doc(`/users/${newUser.handle}`).set(userCredentials);
    })
    .then(() => {
      return res.status(201).json({ token });
    })
    .catch((err) => {
      console.error(err);
      if ("auth/email-already-in-use" == err.code) {
        return res.status(400).json({ email: "email is already in use" });
      } else {
        return res.status(500).json({ error: err.code });
      }
    });
});

app.post("/login", (req, res) => {
  const user = {
    email: req.body.email,
    password: req.body.password,
  };

  let errors = {};

  if (isEmpty(user.email)) {
    errors.email = "Must not be empty";
  } else if (!isEmail(user.email)) {
    errors.email = "Must be valid email address";
  }

  if (isEmpty(user.password)) {
    errors.password = "Must not be empty";
  }
  if (Object.keys(errors).length > 0) {
    return res.status(400).json(errors);
  }

  firebase
    .auth()
    .signInWithEmailAndPassword(user.email, user.password)
    .then((data) => {
      return data.user.getIdToken();
    })
    .then((token) => {
      return res.json(token);
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
});

exports.api = functions.region("asia-south1").https.onRequest(app);

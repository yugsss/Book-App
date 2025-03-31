const admin = require("firebase-admin");
const express = require("express");
const fs = require("fs");
const path = require("path");
const { Storage } = require("@google-cloud/storage");

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.applicationDefault(),
  projectId: "yugam-chheda-midterm2025"
});

const firestore = admin.firestore();
firestore.settings({ databaseId: "yugam-chheda-midterm2025-db" });

const app = express();
const bucket = new Storage().bucket("yugam-chheda-midterm2025-book-images");

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// CORS middleware
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  next();
});

// Serve frontend
app.get("/", async (req, res) => {
  const htmlFile = path.join(__dirname, "public", "index.html");
  fs.readFile(htmlFile, "utf8", (err, data) => {
    if (err) return res.status(500).send("Error loading page");
    res.send(data);
  });
});

// Add book
app.post("/api/books", async (req, res) => {
  try {
    const { title, price, genre } = req.body;
    if (!title || !price || !genre) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    const docRef = await firestore.collection("books").add({ 
      title, 
      price: Number(price), 
      genre,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: "Yugam Chheda"
    });
    res.status(201).json({ id: docRef.id, title, price, genre });
  } catch (err) {
    console.error("Error creating book:", err);
    res.status(500).json({ error: "Could not create book" });
  }
});

// Upload image file
app.post("/api/upload", async (req, res) => {
  const { imageBase64, bookId } = req.body;

  if (!imageBase64 || !bookId) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const fileBuffer = Buffer.from(imageBase64, "base64");
    const fileRef = bucket.file(bookId);
    const writeStream = fileRef.createWriteStream({ resumable: false });

    writeStream.on("error", (err) => {
      console.error("Upload error:", err);
      res.status(500).json({ error: "Upload failed" });
    });

    writeStream.on("finish", async () => {
  
      await fileRef.makePublic();
      
      // Get public URL
      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${bookId}`;
      
      await firestore.collection("books").doc(bookId).update({ 
        imageUrl: publicUrl,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedBy: "Yugam Chheda"
      });
      res.json({ imageUrl: publicUrl });
    });

    writeStream.end(fileBuffer);
  } catch (err) {
    console.error("Upload error:", err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Retrieve books
app.get("/api/books", async (req, res) => {
  try {
    const snapshot = await firestore.collection("books").orderBy("createdAt", "desc").get();
    const books = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    res.json(books);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ error: "Failed to retrieve books" });
  }
});

// Update a book
app.put("/api/books/:id", async (req, res) => {
  try {
    const bookId = req.params.id;
    const { title, price, genre } = req.body;
    
    if (!title || !price || !genre) {
      return res.status(400).json({ error: "Missing required fields" });
    }
    
    await firestore.collection("books").doc(bookId).update({
      title,
      price: Number(price),
      genre,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedBy: "Yugam Chheda"
    });
    res.json({ id: bookId, title, price, genre });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ error: "Update failed" });
  }
});

// Delete a book
app.delete("/api/books/:id", async (req, res) => {
  const bookId = req.params.id;
  try {

    const doc = await firestore.collection("books").doc(bookId).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Book not found" });
    }
    
    const bookData = doc.data();
    
    // Delete image if exists
    if (bookData.imageUrl) {
      const fileName = bookData.imageUrl.split('/').pop();
      await bucket.file(fileName).delete().catch(err => {
        console.error("Error deleting image:", err);
      });
    }
    
    // Delete book document
    await firestore.collection("books").doc(bookId).delete();
    res.json({ id: bookId, message: "Book deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ error: "Delete failed" });
  }
});

exports.bookApp = app;
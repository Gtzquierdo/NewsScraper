var express = require("express");
var logger = require("morgan");
var mongoose = require("mongoose");
var handleBars = require("express-handlebars");

// Our Scraping Tools
// Axios promised-based http library, similar to jQuery AJAX
// Works both client and server
var axios = require("axios");
var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var PORT = process.env.PORT || 8000;
require("dotenv").config();
// Initialize Express
var app = express();

// Configure middleware

// Use morgan logger for logging requests
app.use(logger("dev"));
// Parse request body as JSON
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Make public a static folder
app.use(express.static("public"));

// Routes
app.get('/', (req, res) => {
    res.send(process.env.MONGODB_URI);
})

// GET Route for scraping Medium Website
app.get("/scrape", function(req, res) {
    // Grab the body of the html with axios
    axios.get("https://old.reddit.com/r/popular/").then(function(response) {
        // Then, we laod that into cheerio and save it to $ for a shorthand selector
        var $ = cheerio.load(response.data);
        // Now, we grab the Title (h2) within an article tag, and do the following:
        $(".top-matter").each(function(i, element) {
            // // Save an empty result object
            var result = {};
        var title = $(element)
            .find("p.title").text();
        var link = $(element)
            .find("p.title").children().attr("href");
        result.title = title;
        result.link = link;
        var submitted = $(element)
            .find("p.tagline").find("a.time").text();
        result.submitted = submitted;
        console.log(result);
        db.Article.create(result)
            .then(function(dbArticle) {
          // View the added result in the console
            console.log(dbArticle);
        })
        .catch(function(err) {
          // If an error occurred, log it
            console.log(err);
        });
    });

        // Send message to client
        res.send("Scrape Complete, Please go back to main page.")
    });
});

// Route for getting all Articles from the db
app.get("/articles", function(req, res) {
    // Grab every document in the Articles collection
    db.Article.find({})
        .then(function(dbArticle) {
        // If we were able to successfully find Articles, send them back to the client
        res.json(dbArticle);
    })
        .catch(function(err) {
        // If an error occurred, send it to the client
            res.json(err);
    });
});

// Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
    db.Article.findOne({_id: req.params.id})
    .populate("note")
    .then(function(dbArticle) {
        res.json(dbArticle);
    })
        .catch(function(err) {
            res.json(err);
    });
});

// Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
    db.Note.create(req.body)
    .then(function(dbNote) {
        return db.Article.findOneAndUpdate({_id: req.params.id}, { note: dbNote._id}, { new: true});
    })
        .then(function(dbArticle) {
            res.json(dbArticle);
    })
        .catch(function(err) {
            res.json(err);
    });
});

app.get("/notes", function(req, res) {
    db.Note.find({})
        .then(function(dbNote) {
            res.json(dbNote);
    })
        .catch(function(err) {
        res.json(err);
    });
});

app.get("/notes/:id", function(req, res) {
    db.Note.findOne({ _id: req.params.id })
        .then(function(dbNote) {
            res.json(dbNote);
        })
        .catch(function(err) {
        res.json(err);
    });
});

app.delete("/notes/:id", function (req, res) {
    db.Note.findOneAndDelete({_id: req.params.id})
        .then(function(dbNote) {
        res.json(dbNote);
    })
    .catch(function(err) {
        res.json(err);
    });
});


// Start server
app.listen(PORT, function() {
    console.log("App running on port " + PORT + "!");
});

// If deployed, use the deployed database. Otherwise use the local mongoHeadlines database
var MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost/mongoHeadlines";

mongoose.connect(MONGODB_URI);

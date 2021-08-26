//require express, mongoose, and lodash packages

const express = require("express");
const mongoose = require("mongoose");
const _ = require("lodash");

//start express and add public css files on app startup
const app = express();
app.use(express.static("public"));

//require and use bodyParser package
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({
  extended: true
}));

//setup environment variables via dotenv package
require("dotenv").config();
const USER_NAME = process.env.USER_NAME;
const USER_PWD = process.env.USER_PWD;
const USER_DATA = process.env.USER_DATA;

//start ejs
app.set('view engine', 'ejs');

//connect to MongoDB Atlas Cloud service using specified URL and env variables
mongoose.connect("mongodb+srv://" + USER_NAME + ":" + USER_PWD + "@cluster0.hiofb.mongodb.net/" + USER_DATA + "?retryWrites=true&w=majority", {
  useNewUrlParser: true
});


//create schema for todolist items
const itemSchema = {
  name: String
};

//create model/collection using item schema
const Item = mongoose.model(
  "Item", itemSchema
);

//create default documents for the item collection
const item1 = new Item({
  name: "Welcome to your todolist!"
});

const item2 = new Item({
  name: "Hit '+' button to add a new item! "
});

const item3 = new Item({
  name: "<-- hit checkbox to cross off item."
});

//set default items in an array to add
const defaultItems = [item1, item2, item3];


//create schema for each list page to laod (default, work, etc)
const listSchema = {
  name: String,

  //array of itemSchema items
  items: [itemSchema]
};

//create collection of Lists to load up
const List = mongoose.model("List", listSchema);


//set up get request for default page
app.get("/", function(req, res) {

  //get items from todo list item collection
  Item.find({}, function(err, foundItems) {

    //if there are no items in list, then add default items
    if (foundItems.length === 0) {

      //insert default items to mongo cloud database
      Item.insertMany(defaultItems, function(err) {
        if (err) {
          console.log(err);
        } else {
          console.log("Success saving items to Mongo!");
        }
        //after inserting data, reload page to show new items
        res.redirect("/");
      });

    } else {

      //else the list already exists with items, just render/load the page
      res.render("list", {
        listTitle: "Today",
        newListItems: foundItems
      });
    }

  });

});


//crete get request for creation of dynamic lists
app.get("/:customListName", function(req, res) {

  //get custom list name with capitalized front letter using lodash
  const customListName = _.capitalize(req.params.customListName);

  //search for list in list connection of database
  List.findOne({
    name: customListName
  }, function(err, foundList) {
    if (!err) {

      //if no list with that name exits, just create new one with default items
      if (!foundList) {

        const list = new List({
          //list will have custom name
          name: customListName,
          //will start with default items
          items: defaultItems

        });
        //save list to database
        list.save();
        //reload page to show new page
        res.redirect("/:customListName");

        //else if list with name exists, just render/load page
      } else {

        //render page with found database object
        res.render("list", {
          listTitle: foundList.name,
          newListItems: foundList.items
        });
      }
    }
  });
});

//create post request for when add butoon is pressed
app.post("/", function(req, res) {

  //get inputs from list html page form
  const itemName = req.body.newItem;
  const listName = req.body.list;

  //create new document with item enteed by user
  const item = new Item({
    name: itemName
  });

  //if default list just save and reload page
  if (listName === "Today") {

    item.save();
    res.redirect("/");

  }

  //else if custom list:
  else {

    //once you find list item with that custom name, push new item to its array
    List.findOne({
      name: listName
    }, function(err, foundList) {

      //find items of custom list and add to its existing items, save
      foundList.items.push(item);
      foundList.save();

      //redirect to that list page
      res.redirect("/" + listName);

    })
  }
});

//create post request to delete items
app.post("/delete", function(req, res) {

  //when box is checked, value of checkbox is id of item to delete
  const checkedItemId = req.body.checkbox;

  //get list name from hidden field, to make sure item is removed from right list
  const listName = req.body.listName;

  //if default list, then just delete item and relaod
  if (listName === "Today") {

    Item.findByIdAndRemove(checkedItemId, function(err) {
      if (!err) {
        console.log("Item was deleted.")
        //reload page
        res.redirect("/");
      }
    })

    //else go through list connection to find custom list. Pull and delete item from there.
  } else {

    List.findOneAndUpdate({
      name: listName
    }, {
      $pull: {
        items: {
          _id: checkedItemId
        }
      }
    }, function(err, foundList) {

      if (!err) {
        res.redirect("/" + listName);
      }
    })
  }
})

//Get request for about page, just load about page info
app.get("/about", function(req, res) {
  res.render("about");
});

//heroku will select random port, save it as variable
let port = process.env.PORT;

//if not running on heroku, just default to port 3000- local testing
if (port == null || port == "") {
  port = 3000;
}

//start and listen on server
app.listen(port, function() {
  console.log("Server has started.");
});

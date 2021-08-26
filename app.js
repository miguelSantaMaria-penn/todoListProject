//jshint esversion:6

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const _= require("lodash");

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static("public"));

//connect to MongoDB Atlas- follow instructions for connect to app
mongoose.connect("mongodb+srv://admin-miguel:test123@cluster0.hiofb.mongodb.net/todolistDB?retryWrites=true&w=majority", {useNewUrlParser: true});

//create schema
const itemSchema = {
  name: String
};

//create model/collection using schema
const Item = mongoose.model(
  "Item", itemSchema
);

//create new documents to add to model

const item1 = new Item({
  name: "Welcome to your todolist!"
});

const item2 = new Item({
  name: "Hit '+' button to add a new item! "
});

const item3 = new Item({
  name: "<-- hit checkbox to cross off item."
});

//array of items
const defaultItems = [item1, item2, item3];

//schema for each list page (work, about, etc)
const listSchema = {
  name: String,
  //array of itemSchema items
  items: [itemSchema]
};

//create schema for list page
const List = mongoose.model("List", listSchema);


app.get("/", function(req, res) {


//get items from collection
Item.find({}, function(err, foundItems){

   //if there are no items in list, then add default items
   if(foundItems.length === 0){
     //insert default items to mongoose
     Item.insertMany(defaultItems, function(err){
       if(err){
         console.log(err);
       }else{
         console.log("Success saving items to Mongo!");
       }
       //after inserting, reload page to show new items
       res.redirect("/");
     });

   }else{
     //pass found items into render function for list page
      res.render("list", {listTitle: "Today", newListItems: foundItems});
   }

});

});


//create dynamic user entered route
app.get("/:customListName", function(req,res){
  //get custom list name with capitalized front letter using lodash
  const customListName = _.capitalize(req.params.customListName);

  List.findOne({name: customListName}, function(err, foundList){
    if(!err){

      //create new list if does not exist already
      if(! foundList){

        const list = new List({
          //list will have custom name
          name: customListName,
          //will start with default items
          items: defaultItems

        });
        //save to database
        list.save();
        //reload page to show new page
        res.redirect("/:customListName");

      //else show existing list
      }else{
        //render page with found database object
        res.render("list", {listTitle: foundList.name, newListItems: foundList.items});
      }
    }
  });


});

app.post("/", function(req, res){

  const itemName = req.body.newItem;
  const listName = req.body.list;

  //create new document with item enteed by user
  const item = new Item({
    name: itemName
  });

  //if default list just do normal
  if(listName === "Today"){
    //save item in collection of database
    item.save();

    //reload home page
    res.redirect("/");

  }
  //else if custom list:
  else{
  //once you find list item, push new item to its array
  List.findOne({name: listName}, function(err, foundList){
    //find items of custom list and push
    foundList.items.push(item);
    foundList.save();
    //redirect to that list page
    res.redirect("/" + listName);

  })
  }



});

app.post("/delete", function(req,res){
  //when box is checked, value of checkbox is id of item to delete

  const checkedItemId = req.body.checkbox;
  //get list name from hidden field, to make sure item is removed from right list
  const listName = req.body.listName;

  //if default list, then just do as normal
  if(listName === "Today"){
    //delete item from database
    Item.findByIdAndRemove(checkedItemId, function(err){
      if(! err){
        console.log("Item was deleted.")
        //reload page
        res.redirect("/");
      }
    })
    //delete from custom list
  }else{
    //find list by listName. Pull/delete item from list of items that has that id.
    List.findOneAndUpdate({name: listName}, {$pull: {items: {_id: checkedItemId}}}, function(err, foundList){
      //if no error, just reload page
      if(! err){
        res.redirect("/" + listName);
      }
    })
  }



})




app.get("/about", function(req, res){
  res.render("about");
});

//setting up dynamic port for heroku
//if not run on heroku but local will default to port 3000
let port = process.env.PORT;
if(port == null || port == ""){
  port = 3000;
}

app.listen(port, function() {
  console.log("Server has started.");
});

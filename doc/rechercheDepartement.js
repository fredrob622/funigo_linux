// Import express et router 
const express = require("express");
const router = express.Router();
const bodyParser = require('body-parser');
// var LocalStorage = require('node-localstorage').LocalStorage;
// // constructor function to create a storage directory inside our project for all our localStorage setItem.
// localStorage = new LocalStorage('./scratch');

router.use(bodyParser.urlencoded({ extended: false}));

router.use(express.static('public'));
router.use(express.static('css'));
router.use(express.static('js'));
router.use(express.static('cartes'));


const path = require('path');
console.log(__dirname);
// Import de la connexion mysql 
const db = require("../db/db");

router
.get('/api/rechercheDep', (req, res, next) => { 
   res.render(path.join(__dirname + "./../IHM/departementRech.ejs"));
});


router.post('/api/rechercheDep', function(req, res, next) {

    let num_dep  = req.body.num_dep
    let nom_dep  = req.body.nom_dep 
    let nom_reg  = req.body.nom_reg
    let nom_pref = req.body.nom_pref

    let reqSql =  "select * from departement_fr where";
    
    if(num_dep !== ""){
        // reqSql = `${reqSql}` + " num_dep = " + `${num_dep}`  
        reqSql = `${reqSql}` + " num_dep like '%"  + `${num_dep}` + "%'"
        console.log(reqSql);
    }else{
        reqSql = `${reqSql}` + " num_dep like '%'" 
    }

    if(nom_dep != ""){
        reqSql = `${reqSql}` + " and nom_dep = '" + `${nom_dep}` + "'"
        console.log(reqSql);
    } else{
        reqSql = `${reqSql}` + " and nom_dep like '%'" 
    }

    if(nom_reg != ""){
        reqSql = `${reqSql}` + "  and nom_reg like '%" + `${nom_reg}` + "%'" 
        console.log(reqSql);
    }else{
        reqSql = `${reqSql}` + " and nom_reg like '%'" 
    }

    if(nom_pref != ""){
        reqSql = `${reqSql}` + " and nom_pref like '%" + `${nom_pref}` + "%'" 
        console.log(reqSql);
    }
 
    console.log(reqSql);
    let reqSqlb = reqSql.replace('*', 'count(dep_index) AS namesCount');
    console.log(reqSqlb);

    db.query( reqSql, function (err, result) {
        if (err) {
            console.log(err);
        }else{
          
            // { result } est un tableau contenant les données récupérées par la requête envoyé à la partie cliente
            //  departementAff => fichier departementAff.ejs
            res.status(200).render('departementAff', { result }); // pour ejs
            
        }
    });
    
});

// Rend accessible l'objet router aux autres fichiers 
module.exports = router;
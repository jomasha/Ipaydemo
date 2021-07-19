let express = require('express'),
  router = express.Router(),
  crypto = require('crypto'),
  axios = require("axios"),
  fs = require("fs"),
  Transactions = require("../models/Transactions"),
  transactions = new Transactions();

router.get('/', function (req, res, next) {
  res.render('index');
});
router.post('/sendRequest', function (req, res, nex) {
  let vid = req.body.vid,
    reference = req.body.reference,
    phone = req.body.phone,
    amount = req.body.amount,
    datastring = "amount=" + amount + "&phone=" + phone + "&reference=" + reference + "&vid=" + vid;
  let hash = crypto.createHmac('SHA256', "demo").update(datastring).digest('hex');

  axios.post('https://apis.staging.ipayafrica.com/b2c/v3/mobile/mpesa', { vid, reference, phone, hash, amount }).then(res => {
    console.log(res.data);
    if (res.data.status == 200) {
      transactions.vid = vid;
      transactions.refference = reference;
      transactions.phone = phone;
      transactions.amount = amount;
      transactions.status = "Sent Awaiting feedback";
      transactions.create(req, function (result) {
        if (result == 1) {
          res.render('index', { response: res.data.text });
        } else {
          res.render('index', { response: "err" });
        }
      });
    }
  }).catch(err => {
    console.log(err);
    res.render('index', { response: 'err', err: err });
  });

  fs.writeFile('./docs/' + reference + '.txt', hash, err => {
    if (err) {
      console.error(err)
      return
    }
    //file written successfully
  })

});

router.get('/mpesaCallBack', function (req, res, next) {
  let ref = req.query.ipay_reference,
    merchant_ref = req.query.merchant_reference,
    status = req.query.status,
    hash = req.query.hash,
    mmref = req.query.mmref,
    dataString = "ipay_reference=" + ref + "&merchant_reference=" + merchant_ref + "&mmref=" + mmref + "&status=" + status;
  try {
    var data = fs.readFileSync('./docs/' + merchant_ref + '.txt', 'utf8');
    let oHash = data.toString();
    if (oHash == hash) {
      console.info("Status for request of ref : " + merchant_ref + " is " + status);
      transactions.ipayRef = ref;
      transactions.status = status;
      transactions.transaction_ref = mmref;
      transactions.refference = merchant_ref;
      transactions.update(function (result) {
        console.log(result);
        if (result == 1) {
          console.info("Success");
        } else {
          console.log("err", result);
        }

      });
      //In production would update the transaction with the status using the merchant_ref and notify the user.
    } else {
      console.error("Error : the request cannot be validated - hash mismatch");
    }
  } catch (e) {
    console.error('Error:', e.stack);
  }

})
router.get('/searchTransaction', function (req, res, next) {
  transactions.transaction_ref = req.query.transactionId;
  if (req.query.transactionId) {
    transactions.getByTransaction(function (result) {
      console.info(result);
      res.status("200").json(result);
    });
  } else {
    res.status('418').send("Not Found");
  }


});
module.exports = router;

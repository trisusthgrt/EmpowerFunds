const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv/config');
const { Storage } = require('@google-cloud/storage');
const Audience = require('./models/Audience');
const Creator = require('./models/Creator');
const Exclusive = require('./models/Exclusive');

const path = require('path');
const multer = require('multer');
const Project = require('./models/Project');
const { replaceOne } = require('./models/Audience');
const Razorpay = require("razorpay");

const app = express();

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const storage = new Storage({
  keyFilename: './google-cloud-creds.json',
  projectId: 'jovial-pod-392309',
});
const bucketName = 'fundify';

let currentEmail;

const uploadToGoogleCloudStorage = (file, destination) => {
  const bucket = storage.bucket(bucketName);
  const fileName = `${destination}/${file.originalname}`;

  const fileStream = bucket.file(fileName).createWriteStream({
    resumable: false,
    metadata: {
      contentType: file.mimetype,
    },
  });

  return new Promise((resolve, reject) => {
    fileStream.on('error', reject);
    fileStream.on('finish', () => {
      const publicUrl = `https://storage.googleapis.com/${bucketName}/${fileName}`;
      resolve(publicUrl);
    });

    fileStream.end(file.buffer);
  });
};

// // Get data from device
// app.post('/data', (req, res) => {
//   Device.updateOne(
//     { esn: req.body.esn },
//     {
//       $set: {
//         temp: req.body.temp,
//         hum: req.body.hum,
//         soil: req.body.soil,
//         relay1: req.body.relay1,
//         relay2: req.body.relay2,
//         relay3: req.body.relay3,
//         relay4: req.body.relay4,
//         timestamp: req.body.timestamp,
//       },
//     }
//   )
//     .then((data) => res.json({ responestatus: '1' }))
//     .catch((error) => {
//       res.json({ responsestatus: '0' });
//     });
// });

app.use(express.static('public'));

app.post("/orders", async (req, res) => {
  try {
    console.log(req.body.amount);
      const instance = new Razorpay({
          key_id: "rzp_test_XphPOSB4djGspx",
          key_secret: "CCrxVo3coD3SKNM3a0Bbh2my",
      });

      const options = {
          amount: req.body.amount, // amount in smallest currency unit
          currency: "INR",
        //  receipt: "receipt_order_74394",
      };

      const order = await instance.orders.create(options);

      if (!order) return res.status(500).send("Some error occured");

      res.json(order);
  } catch (error) {
      res.status(500).send(error);
  }
});

app.post('/users/new', (req, res) => {
  if (req.body.userType === 'creator') {
    const creator = new Creator({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      pageName: req.body.pageName,
      category: req.body.category,
      email: req.body.email,
      password: req.body.password,
      profileURL: "",
      description: req.body.description,
    });
    currentEmail = req.body.email;
    Creator.create(creator, (err, creator) => {
      console.log(err);
      res.send(creator);
    });
  } else {
    const audience = new Audience({
      firstName: req.body.firstName,
      lastName: req.body.lastName,
      email: req.body.email,
      password: req.body.password,
    });
    Audience.create(audience, (err, audience) => {
      console.log(err);
      res.send(audience);
    });
  }
});


app.post('/upload/creator/profile/image/:pageName', (req, res) => {
  const pageName = req.params.pageName;
  const upload = multer().single('profileImage');
  upload(req, res, async (err) => {
    if (err) {
      console.error('Error uploading file:', err);
      return res.status(500).send("Error uploading file:");
    }

    const file = req.file;
    console.log("current email value",currentEmail)
    if (!file) {
      console.error('No file found in the request.');
      return res.status(400).send("No file found in the request");
    }

    try {
      const destination = `creators/${pageName}/profile`;
      const publicUrl = await uploadToGoogleCloudStorage(file, destination);
      console.log('Uploaded to Google Cloud Storage:', publicUrl);
      if(currentEmail){
        Creator.updateOne(
          { email: currentEmail }, // Filter the creator by email
          { $set: { profileURL: publicUrl } } // Update the profileURL field
        )
          .then(() => {
            console.log('Creator profileURL updated successfully.');
          })
          .catch((error) => {
            console.error('Error updating creator profileURL:', error);
          });
      }
      return res.status(200).send("Uploaded to Google Cloud Storage:");
    } catch (error) {
      console.error('Error uploading file to Google Cloud Storage:', error);
      return res.status(500).send("Error uploading file to Google Cloud Storage");
    }
  });
});

app.post('/users/login', async(req, res) => {
  if (req.body.userType == 'creator'){
    const creatorUser = await  Creator.findOne({ email: req.body.email });
    if(creatorUser && req.body.password==creatorUser.password){
      return res.status(200).send(creatorUser)
    }
  }else{
    const audienceUser = await Audience.findOne({ email: req.body.email });
    if(audienceUser && req.body.password==audienceUser.password){
      return res.status(200).send(audienceUser);
    }
  }
    return res.status(201).send("USER NOT FOUND")
});

app.post('/projects/new', (req, res) => {
  const project = new Project({
    email: req.body.email,
    pageName: req.body.pageName,
    title: req.body.title,
    description: req.body.description,
    amount: req.body.amount,
    projectURL:""
  });

  Project.create(project, (err, project) => {
    console.log(err);
    res.send(project);
  });
});

app.post('/projects/upload/:pageName', (req, res) => {
  const pageName = req.params.pageName;
  const upload = multer().single('projectImage');
  upload(req, res, async (err) => {
    if (err) {
      console.error('Error uploading file:', err);
      return res.status(500).send("Error uploading file:");
    }

    const file = req.file;
    console.log("current email value",currentEmail)
    if (!file) {
      console.error('No file found in the request.');
      return res.status(400).send("No file found in the request");
    }

    try {
      const destination = `creators/${pageName}/projects`;
      const publicUrl = await uploadToGoogleCloudStorage(file, destination);
      console.log('Uploaded to Google Cloud Storage:', publicUrl);
      console.log("currentEmail",currentEmail)
      if(currentEmail){
        Project.updateOne(
          {
            email: currentEmail,
            pageName: pageName
          },
          {
            $set: {
              projectURL: publicUrl
            }
          }
        )
          .then(() => {
            console.log('Project projectURL updated successfully.');
          })
          .catch((error) => {
            console.error('Error updating Project projectURL:', error);
          });
      }
      return res.status(200).send("Uploaded to Google Cloud Storage:");
    } catch (error) {
      console.error('Error uploading file to Google Cloud Storage:', error);
      return res.status(500).send("Error uploading file to Google Cloud Storage");
    }
  });
});

app.get('/projects', (req, res) => {
  if (req.query.email) {
    Project.find({ email: req.query.email }).then((data) => res.send(data));
  } else {
    Project.find({}).then((data) => res.send(data));
  }
});

app.get('/creators', (req, res) => {
  if (req.query.email && req.query.pageName) {
    Creator.find({ email: req.query.email }).then((data) => res.send(data));
  } else {
    Creator.find().then((data) => res.send(data));
  }
});

app.post('/creator/subscribe', (req, res) => {
  Creator.findOneAndUpdate(
    { pageName: req.body.pageName },
    {
      $push: {
        audience: {
          audienceEmail: req.body.audienceEmail,
          amount: req.body.amount,
          firstName: req.body.firstName,
          lastName: req.body.lastName,
        },
      },
    }
  ).then(() =>
    Audience.findOneAndUpdate(
      { email: req.body.audienceEmail },
      {
        $push: {
          creators: {
            pageName: req.body.pageName,
            amount: req.body.amount,
          },
        },
      }
    ).then(() => res.send('subscribed'))
  );
});

app.post('/creator/project/pledge', (req, res) => {
  console.log(req.body.projectTitle, req.body.pageName);
  Project.findOneAndUpdate(
    { title: req.body.projectTitle, pageName: req.body.pageName },
    {
      $push: {
        audience: {
          audienceEmail: req.body.audienceEmail,
          amount: req.body.amount,
          firstName: req.body.firstName,
          lastName: req.body.lastName,
          timestamp: req.body.timestamp,
        },
      },
    }
  ).then(() => res.send('pledged'));
});

app.post('/creator/funds/audience', (req, res) => {
  Creator.findOne({ pageName: req.body.pageName }).then((data) =>
    res.send(data)
  );
});

app.post('/creator/funds/projects', (req, res) => {
  Project.find({ pageName: req.body.pageName }).then((data) => res.send(data));
});

app.post('/creator/exclusive/view', (req, res) => {
  console.log("input",req.body.pageName)
  Exclusive.find({ pageName: req.body.pageName }).then((data) =>{
  const dataArray = data;
  let exclusiveURL;
  if(!Array.isArray(dataArray)){
    dataArray=[dataArray];
  }
  res.send(dataArray)
}
  );
});

app.post('/creator/exclusive/new', (req, res) => {
  const exclusive = new Exclusive({
    email: req.body.email,
    pageName: req.body.pageName,
    title: req.body.title,
    description: req.body.description,
    exclusiveURL: ""
  });

  Exclusive.create(exclusive, (err, exclusive) => {
    console.log(err);
    res.send(exclusive);
  });
});

app.post('/exclusive/upload/:pageName', (req, res) => {
  const pageName = req.params.pageName;
  const upload = multer().single('contentFile');
  upload(req, res, async (err) => {
    if (err) {
      console.error('Error uploading file:', err);
      return res.status(500).send("Error uploading file:");
    }

    const file = req.file;
    console.log("current email value",currentEmail)
    if (!file) {
      console.error('No file found in the request.');
      return res.status(400).send("No file found in the request");
    }

    try {
      const destination = `creators/${pageName}/exclusive/${req.query.title}`;
      const publicUrl = await uploadToGoogleCloudStorage(file, destination);
      console.log('Uploaded to Google Cloud Storage:', publicUrl);
      if(currentEmail){
        Exclusive.updateOne(
          { email: currentEmail }, // Filter the creator by email
          { $set: { exclusiveURL: publicUrl } } // Update the profileURL field
        )
          .then(() => {
            console.log('Creator exclusiveURL updated successfully.');
          })
          .catch((error) => {
            console.error('Error updating creator exclusiveURL:', error);
          });
      }
      return res.status(200).send("Uploaded to Google Cloud Storage:");
    } catch (error) {
      console.error('Error uploading file to Google Cloud Storage:', error);
      return res.status(500).send("Error uploading file to Google Cloud Storage");
    }
  });
});

app.post('/audience/info', (req, res) => {
  Audience.findOne({ pageName: req.body.email }).then((data) => res.send(data));
});

app.post('/creators/exclusive', async (req, res) => {
  let pageNames = req.body.pageNames;
  const userEmail = req.body.userEmail;
  let creators = [];

  const audData = await Audience.find({email: userEmail})
  const pageNamesArray = audData[0].creators.map(item => item.pageName);

  const exclusiveData = await Exclusive.find({ pageName: { $in: pageNamesArray } });

  // pageNames.forEach(async (element, index) => {
  //   let data = await Exclusive.find({ pageName: element });
  //   creators.push(...data);
  //   if (index === pageNames.length - 1) {
  //    // console.log(creators);
  //    console.log(creators);
  //     res.send(creators);
  //   }
  // });
  res.send(exclusiveData)
});

mongoose.connect(process.env.DB_CONNECTION, { useNewUrlParser: true }, () => {
  console.log('Connected to database!');
});

const PORT = process.env.PORT || 8000;

app.listen(PORT);

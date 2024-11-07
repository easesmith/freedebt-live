// req.perm;

exports.authorize = (section,accessType) => {
   return (req, res, next) => {
     const adminPermissions = req.perm || {};
    //  console.log('section', section)
    //  console.log("accessType", accessType);
            // console.log("perm", adminPermissions);

     if (
       (accessType === "read" || accessType === "write") &&
       (adminPermissions[section] === accessType ||
         adminPermissions[section] === "write")
     ) {
      //  console.log("Permission granted !!");
       next();
       return;
     }

       return res.status(403).json({message:"Forbidden- Insufficient Permissions"})
    }; 
}




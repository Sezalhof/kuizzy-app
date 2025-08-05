// functions/data/locations.js
module.exports = {
  divisions: [
    {
      id: "10",
      name: "Dhaka",
      districts: [
        {
          id: "101",
          name: "Dhaka",
          upazilas: [
            {
              id: "1011",
              name: "Dhanmondi",
              unions: ["Ward 1", "Ward 2"],
              schools: [
                {
                  id: "s1",
                  name: "Ideal School and College",
                  type: "High School"
                }
              ]
            },
            {
              id: "1012",
              name: "Mirpur",
              unions: ["Ward 5", "Ward 6"],
              schools: [
                {
                  id: "s2",
                  name: "Mirpur High School",
                  type: "High School"
                }
              ]
            }
          ]
        },
        {
          id: "102",
          name: "Gazipur",
          upazilas: [
            {
              id: "1021",
              name: "Tongi",
              unions: ["Ward A", "Ward B"],
              schools: [
                {
                  id: "s3",
                  name: "Tongi Model School",
                  type: "High School"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
};

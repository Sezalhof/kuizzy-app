// src/data/locations/rangpur/gaibandha/gobindaganjData.js

const gobindaganjData = {
    division: {
      id: "07",
      name: "Rangpur"
    },
    district: {
      id: "56",
      name: "Gaibandha"
    },
    upazila: {
      id: "5601",
      name: "Gobindaganj"
    },
    unions: [
      { id: "560101", name: "Rakhalburuj" },
      { id: "560102", name: "Phulbari" },
      { id: "560103", name: "Kamdia" },
      // ...
    ],
    pouroshavas: [
      { id: "5601P1", name: "Gobindaganj Pourashava" },
    ],
    schools: [
      {
        id: "5601S1",
        name: "Gobindaganj Pilot High School",
        unionId: "560101"
      },
      {
        id: "5601S2",
        name: "Kamdia Model School",
        unionId: "560103"
      },
      // ...
    ]
  };
  
  export default gobindaganjData;
  
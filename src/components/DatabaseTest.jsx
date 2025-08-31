// Create this as a new component: src/components/DatabaseTest.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

export default function DatabaseTest() {
  const [results, setResults] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const testDatabase = async () => {
      setLoading(true);
      const testResults = {};
      
      try {
        // Test 1: Get ALL documents in scores collection
        console.log("=== TESTING ALL SCORES ===");
        const allScoresQuery = query(collection(db, "scores"));
        const allScoresSnapshot = await getDocs(allScoresQuery);
        
        const allDocs = [];
        allScoresSnapshot.forEach(doc => {
          allDocs.push({ id: doc.id, ...doc.data() });
        });
        
        testResults.totalDocs = allDocs.length;
        testResults.allDocs = allDocs;
        console.log("Total documents:", allDocs.length);
        console.log("All documents:", allDocs);

        // Test 2: Check period filter
        console.log("=== TESTING PERIOD FILTER ===");
        const periodQuery = query(
          collection(db, "scores"), 
          where("twoMonthPeriod", "==", "2025-JulAug")
        );
        const periodSnapshot = await getDocs(periodQuery);
        
        const periodDocs = [];
        periodSnapshot.forEach(doc => {
          periodDocs.push({ id: doc.id, ...doc.data() });
        });
        
        testResults.periodDocs = periodDocs;
        console.log("Period filtered documents:", periodDocs.length);
        console.log("Period documents:", periodDocs);

        // Test 3: Check group filter
        console.log("=== TESTING GROUP FILTER ===");
        const groupQuery = query(
          collection(db, "scores"), 
          where("groupId", "==", "31d7146e-359e-4578-9fd7-f43378f25da3")
        );
        const groupSnapshot = await getDocs(groupQuery);
        
        const groupDocs = [];
        groupSnapshot.forEach(doc => {
          groupDocs.push({ id: doc.id, ...doc.data() });
        });
        
        testResults.groupDocs = groupDocs;
        console.log("Group filtered documents:", groupDocs.length);
        console.log("Group documents:", groupDocs);

        // Test 4: Combined filter
        console.log("=== TESTING COMBINED FILTER ===");
        const combinedQuery = query(
          collection(db, "scores"), 
          where("twoMonthPeriod", "==", "2025-JulAug"),
          where("groupId", "==", "31d7146e-359e-4578-9fd7-f43378f25da3")
        );
        const combinedSnapshot = await getDocs(combinedQuery);
        
        const combinedDocs = [];
        combinedSnapshot.forEach(doc => {
          combinedDocs.push({ id: doc.id, ...doc.data() });
        });
        
        testResults.combinedDocs = combinedDocs;
        console.log("Combined filtered documents:", combinedDocs.length);
        console.log("Combined documents:", combinedDocs);

        // Test 5: Check specific user
        console.log("=== TESTING USER FILTER ===");
        const userQuery = query(
          collection(db, "scores"), 
          where("userId", "==", "3HxqI39WOZUnbdw1rzwVsRDUF0s1")
        );
        const userSnapshot = await getDocs(userQuery);
        
        const userDocs = [];
        userSnapshot.forEach(doc => {
          userDocs.push({ id: doc.id, ...doc.data() });
        });
        
        testResults.userDocs = userDocs;
        console.log("User documents:", userDocs.length);
        console.log("User documents:", userDocs);

      } catch (error) {
        console.error("Database test error:", error);
        testResults.error = error.message;
      }
      
      setResults(testResults);
      setLoading(false);
    };

    testDatabase();
  }, []);

  if (loading) {
    return <div className="p-4">Testing database connection...</div>;
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Database Test Results</h2>
      
      {results.error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong>Error:</strong> {results.error}
        </div>
      )}
      
      <div className="space-y-6">
        <div className="bg-gray-100 p-4 rounded">
          <h3 className="font-bold text-lg mb-2">Total Documents in Scores Collection</h3>
          <p className="text-2xl font-bold text-blue-600">{results.totalDocs || 0}</p>
          {results.allDocs && results.allDocs.length > 0 && (
            <div className="mt-2">
              <p className="font-medium">Sample document:</p>
              <pre className="text-xs bg-white p-2 rounded mt-1 overflow-x-auto">
                {JSON.stringify(results.allDocs[0], null, 2)}
              </pre>
            </div>
          )}
        </div>

        <div className="bg-blue-100 p-4 rounded">
          <h3 className="font-bold text-lg mb-2">Period Filter (2025-JulAug)</h3>
          <p className="text-2xl font-bold text-blue-600">{results.periodDocs?.length || 0} documents</p>
          {results.periodDocs && results.periodDocs.length > 0 && (
            <div className="mt-2">
              <p className="text-green-600 font-medium">✓ Period filter working</p>
            </div>
          )}
        </div>

        <div className="bg-green-100 p-4 rounded">
          <h3 className="font-bold text-lg mb-2">Group Filter</h3>
          <p className="text-2xl font-bold text-green-600">{results.groupDocs?.length || 0} documents</p>
          {results.groupDocs && results.groupDocs.length > 0 ? (
            <div className="mt-2">
              <p className="text-green-600 font-medium">✓ Group filter working</p>
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-red-600 font-medium">✗ No documents found with this groupId</p>
            </div>
          )}
        </div>

        <div className="bg-yellow-100 p-4 rounded">
          <h3 className="font-bold text-lg mb-2">Combined Filter (Period + Group)</h3>
          <p className="text-2xl font-bold text-yellow-600">{results.combinedDocs?.length || 0} documents</p>
          {results.combinedDocs && results.combinedDocs.length > 0 ? (
            <div className="mt-2">
              <p className="text-green-600 font-medium">✓ Combined filter working - This should show in leaderboard!</p>
            </div>
          ) : (
            <div className="mt-2">
              <p className="text-red-600 font-medium">✗ No documents match both period and group</p>
            </div>
          )}
        </div>

        <div className="bg-purple-100 p-4 rounded">
          <h3 className="font-bold text-lg mb-2">User Filter</h3>
          <p className="text-2xl font-bold text-purple-600">{results.userDocs?.length || 0} documents</p>
          {results.userDocs && results.userDocs.length > 0 && (
            <div className="mt-2">
              <p className="text-green-600 font-medium">✓ Found user's score records</p>
            </div>
          )}
        </div>

        {results.allDocs && results.allDocs.length > 0 && (
          <div className="bg-gray-50 p-4 rounded">
            <h3 className="font-bold text-lg mb-2">All Documents Debug</h3>
            <pre className="text-xs bg-white p-3 rounded overflow-x-auto max-h-96">
              {JSON.stringify(results.allDocs, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
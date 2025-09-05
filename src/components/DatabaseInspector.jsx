// DatabaseInspector.jsx - CLEANED VERSION (Debug logs removed)
import React, { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

export default function DatabaseInspector({ userId, groupId, period, visible = true }) {
  const [inspectionData, setInspectionData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dedup, setDedup] = useState(true);

  const runInspection = useCallback(async () => {
    setLoading(true);
    try {
      const results = {
        timestamp: new Date().toISOString(),
        parameters: { userId, groupId, period },
        collections: {},
        analysis: {},
        query_test: null,
      };

      // Fetch all test_attempts
      const attemptsRef = collection(db, "test_attempts");
      const allAttemptsSnapshot = await getDocs(attemptsRef);

      const allAttempts = [];
      allAttemptsSnapshot.forEach((doc) => {
        allAttempts.push({ id: doc.id, ...doc.data() });
      });

      results.collections.test_attempts = {
        total: allAttempts.length,
        documents: allAttempts,
      };

      // Period analysis
      const periods = [...new Set(allAttempts.map((doc) => doc.twoMonthPeriod).filter(Boolean))];
      results.analysis.periods_found = periods;
      results.analysis.expected_period = period;
      results.analysis.period_exists = periods.includes(period);
      results.analysis.period_format_issues = periods.filter((p) => !p.includes("-") || p.length < 8);

      // Group analysis
      const groupIds = [...new Set(allAttempts.map((doc) => doc.groupId).filter(Boolean))];
      results.analysis.groups_found = groupIds;
      results.analysis.expected_group = groupId;
      results.analysis.group_exists = groupIds.includes(groupId);

      // Matching documents (optionally deduplicated)
      let matchingDocs = allAttempts.filter((doc) => doc.twoMonthPeriod === period && doc.groupId === groupId);
      if (dedup) {
        const seen = new Set();
        matchingDocs = matchingDocs.filter((doc) => {
          if (seen.has(doc.userId)) return false;
          seen.add(doc.userId);
          return true;
        });
      }
      results.analysis.matching_documents = matchingDocs;

      // Separate Firestore query test
      if (period && groupId) {
        try {
          const specificQuery = query(
            collection(db, "test_attempts"),
            where("twoMonthPeriod", "==", period),
            where("groupId", "==", groupId)
          );
          const specificSnapshot = await getDocs(specificQuery);
          const docs = [];
          specificSnapshot.forEach((doc) => docs.push({ id: doc.id, ...doc.data() }));
          results.query_test = {
            query_successful: true,
            results_count: specificSnapshot.size,
            documents: docs,
          };
        } catch (error) {
          results.query_test = {
            query_successful: false,
            error: error.message,
          };
        }
      }

      setInspectionData(results);
    } catch (error) {
      console.error("Database inspection failed:", error);
      setInspectionData({
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, [userId, groupId, period, dedup]);

  useEffect(() => {
    if (visible && userId && (groupId || period)) {
      runInspection();
    }
  }, [visible, userId, groupId, period, runInspection]);

  return (
    <div className="mt-6 p-4 bg-yellow-50 border border-yellow-300 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-yellow-800">Database Inspector</h3>
        <div className="flex items-center gap-2">
          <label className="text-yellow-800 text-sm">
            <input type="checkbox" checked={dedup} onChange={() => setDedup(!dedup)} /> Deduplicate Users
          </label>
          <button
            onClick={runInspection}
            disabled={loading}
            className="px-3 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50"
          >
            {loading ? "Inspecting..." : "Refresh"}
          </button>
        </div>
      </div>

      {loading && <div className="text-center text-gray-600">Inspecting database contents...</div>}

      {inspectionData?.error && (
        <div className="text-red-600 mb-4">
          <strong>Error:</strong> {inspectionData.error}
        </div>
      )}

      {inspectionData && !inspectionData.error && (
        <div className="space-y-4 text-sm">
          {/* Search Parameters */}
          <div>
            <strong className="text-yellow-800">Search Parameters:</strong>
            <div className="ml-4 font-mono text-xs bg-white p-2 rounded border">
              <div>User ID: {inspectionData.parameters.userId || "N/A"}</div>
              <div>Group ID: {inspectionData.parameters.groupId || "N/A"}</div>
              <div>Period: {inspectionData.parameters.period || "N/A"}</div>
            </div>
          </div>

          {/* Collection Summary */}
          <div>
            <strong className="text-yellow-800">Collection Summary:</strong>
            <div className="ml-4">
              Total test_attempts documents: {inspectionData.collections.test_attempts.total}
            </div>
          </div>

          {/* Period Analysis */}
          <div>
            <strong className="text-yellow-800">Period Analysis:</strong>
            <div className="ml-4">
              <div>Periods found in DB: {inspectionData.analysis.periods_found.join(", ") || "None"}</div>
              <div>Expected period: <code>{inspectionData.analysis.expected_period}</code></div>
              <div>Period exists: {inspectionData.analysis.period_exists ? "Yes" : "No"}</div>
              {inspectionData.analysis.period_format_issues.length > 0 && (
                <div className="text-red-600">
                  Malformed periods: {inspectionData.analysis.period_format_issues.join(", ")}
                </div>
              )}
            </div>
          </div>

          {/* Group Analysis */}
          <div>
            <strong className="text-yellow-800">Group Analysis:</strong>
            <div className="ml-4">
              <div>
                Groups found in DB: {inspectionData.analysis.groups_found.slice(0, 5).join(", ")}
                {inspectionData.analysis.groups_found.length > 5 && " ...(truncated)"}
              </div>
              <div>Expected group: <code>{inspectionData.analysis.expected_group}</code></div>
              <div>Group exists: {inspectionData.analysis.group_exists ? "Yes" : "No"}</div>
            </div>
          </div>

          {/* Matching Documents */}
          <div>
            <strong className="text-yellow-800">Matching Documents:</strong>
            <div className="ml-4">
              Found {inspectionData.analysis.matching_documents.length} documents matching both period and group
              {inspectionData.analysis.matching_documents.length > 0 && (
                <div className="mt-2 font-mono text-xs bg-white p-2 rounded border max-h-32 overflow-y-auto">
                  {inspectionData.analysis.matching_documents.map((doc, idx) => (
                    <div key={idx} className="mb-1">
                      {doc.userId} - {doc.combinedScore} pts ({doc.twoMonthPeriod})
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Query Test */}
          {inspectionData.query_test && (
            <div>
              <strong className="text-yellow-800">Direct Query Test:</strong>
              <div className="ml-4">
                {inspectionData.query_test.query_successful ? (
                  <>
                    <div>Query executed: Success</div>
                    <div>Results found: {inspectionData.query_test.results_count}</div>
                    {inspectionData.query_test.results_count > 0 && (
                      <div className="mt-2">
                        <strong>Sample Results:</strong>
                        <div className="ml-2 font-mono text-xs bg-white p-2 rounded border max-h-40 overflow-y-auto">
                          {inspectionData.query_test.documents.slice(0, 3).map((doc, idx) => (
                            <div key={idx} className="mb-2 pb-2 border-b">
                              <div>ID: {doc.id}</div>
                              <div>User: {doc.userId}</div>
                              <div>Group: {doc.groupId}</div>
                              <div>Period: {doc.twoMonthPeriod}</div>
                              <div>Score: {doc.combinedScore}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-red-600">Query failed: {inspectionData.query_test.error}</div>
                )}
              </div>
            </div>
          )}

          {/* Raw Data Sample */}
          {inspectionData.collections.test_attempts.documents.length > 0 && (
            <details className="mt-4">
              <summary className="cursor-pointer text-yellow-800 font-semibold">Raw Data Sample (Click to expand)</summary>
              <div className="mt-2 font-mono text-xs bg-white p-2 rounded border max-h-60 overflow-y-auto">
                <div className="mb-2 text-gray-600">Showing first 3 documents:</div>
                {inspectionData.collections.test_attempts.documents.slice(0, 3).map((doc, idx) => (
                  <div key={idx} className="mb-4 p-2 bg-gray-50 rounded">
                    <div className="font-semibold">Document {idx + 1} (ID: {doc.id})</div>
                    <div>userId: {doc.userId}</div>
                    <div>groupId: {doc.groupId}</div>
                    <div>twoMonthPeriod: {doc.twoMonthPeriod}</div>
                    <div>combinedScore: {doc.combinedScore}</div>
                    <div>finishedAt: {doc.finishedAt?.toDate?.()?.toString() || "N/A"}</div>
                  </div>
                ))}
              </div>
            </details>
          )}

          {/* Recommendations */}
          <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
            <strong className="text-blue-800">Recommendations:</strong>
            <div className="ml-4 mt-2 text-blue-700">
              {!inspectionData.analysis.period_exists && (
                <div>• Period "{inspectionData.analysis.expected_period}" not found. Check date utility function.</div>
              )}
              {!inspectionData.analysis.group_exists && (
                <div>• Group "{inspectionData.analysis.expected_group}" not found. Verify group ID is correct.</div>
              )}
              {inspectionData.analysis.matching_documents.length === 0 && (
                <div>• No documents match both criteria. Check if test attempts were saved correctly.</div>
              )}
              {inspectionData.query_test && !inspectionData.query_test.query_successful && (
                <div>• Direct query failed. Check Firestore rules and query syntax.</div>
              )}
              {inspectionData.collections.test_attempts.total === 0 && (
                <div>• No documents in test_attempts collection. Ensure tests are being saved.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
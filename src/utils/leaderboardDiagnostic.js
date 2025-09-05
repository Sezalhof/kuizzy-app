// src/utils/leaderboardDiagnostic.js - DIAGNOSTIC UTILITY
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Comprehensive diagnostic tool for leaderboard issues
 * Run this in the browser console to diagnose data problems
 */
export class LeaderboardDiagnostic {
  constructor() {
    this.results = {
      totalDocuments: 0,
      validDocuments: 0,
      periods: new Set(),
      groups: new Set(),
      users: new Set(),
      duplicateUsers: {},
      schemaIssues: [],
      periodAnalysis: {},
      groupAnalysis: {},
    };
  }

  async diagnose(period = null, groupId = null) {
    console.log("🔍 Starting Leaderboard Diagnostic...");
    console.log("Target Period:", period || "ALL");
    console.log("Target Group:", groupId || "ALL");

    try {
      // Get all documents or filtered by period/group
      let q = query(collection(db, "test_attempts"));
      
      if (period) {
        q = query(q, where("twoMonthPeriod", "==", period));
      }
      
      if (groupId) {
        q = query(q, where("groupId", "==", groupId));
      }

      const snapshot = await getDocs(q);
      this.results.totalDocuments = snapshot.size;

      console.log(`📊 Found ${snapshot.size} total documents`);

      // Analyze each document
      snapshot.forEach((doc) => {
        const data = doc.data();
        this.analyzeDocument(doc.id, data);
      });

      // Generate analysis
      this.generateAnalysis();
      this.printReport();

      return this.results;
    } catch (error) {
      console.error("❌ Diagnostic failed:", error);
      return null;
    }
  }

  analyzeDocument(docId, data) {
    // Track basic info
    if (data.twoMonthPeriod) this.results.periods.add(data.twoMonthPeriod);
    if (data.groupId) this.results.groups.add(data.groupId);
    if (data.userId) this.results.users.add(data.userId);

    // Check for duplicates
    if (data.userId) {
      const key = `${data.userId}_${data.twoMonthPeriod}_${data.groupId}`;
      if (!this.results.duplicateUsers[key]) {
        this.results.duplicateUsers[key] = [];
      }
      this.results.duplicateUsers[key].push({
        docId,
        score: data.score,
        combinedScore: data.combinedScore,
        finishedAt: data.finishedAt?.toDate?.(),
        timeTaken: data.timeTaken,
      });
    }

    // Validate schema
    const issues = [];
    
    if (!data.userId) issues.push("Missing userId");
    if (!data.twoMonthPeriod) issues.push("Missing twoMonthPeriod");
    if (data.combinedScore === undefined && data.score === undefined) {
      issues.push("Missing both combinedScore and score");
    }
    if (!data.finishedAt) issues.push("Missing finishedAt");
    
    if (data.combinedScore !== undefined) {
      if (typeof data.combinedScore !== 'number') {
        issues.push(`combinedScore is ${typeof data.combinedScore}, not number`);
      } else if (isNaN(data.combinedScore)) {
        issues.push("combinedScore is NaN");
      }
    }

    if (issues.length === 0) {
      this.results.validDocuments++;
    } else {
      this.results.schemaIssues.push({ docId, issues });
    }
  }

  generateAnalysis() {
    // Analyze periods
    this.results.periods.forEach(period => {
      this.results.periodAnalysis[period] = {
        totalDocs: 0,
        validDocs: 0,
        groups: new Set(),
        users: new Set(),
      };
    });

    // Analyze groups
    this.results.groups.forEach(group => {
      this.results.groupAnalysis[group] = {
        totalDocs: 0,
        validDocs: 0,
        periods: new Set(),
        users: new Set(),
      };
    });

    // Count duplicates
    const duplicates = Object.entries(this.results.duplicateUsers)
      .filter(([_, attempts]) => attempts.length > 1);
    
    this.results.duplicateCount = duplicates.length;
    this.results.duplicateDetails = duplicates.slice(0, 10); // First 10 for display
  }

  printReport() {
    console.log("\n=== 📊 LEADERBOARD DIAGNOSTIC REPORT ===");
    
    console.log(`\n📈 DOCUMENT SUMMARY:`);
    console.log(`Total Documents: ${this.results.totalDocuments}`);
    console.log(`Valid Documents: ${this.results.validDocuments}`);
    console.log(`Invalid Documents: ${this.results.totalDocuments - this.results.validDocuments}`);
    console.log(`Unique Periods: ${this.results.periods.size}`);
    console.log(`Unique Groups: ${this.results.groups.size}`);
    console.log(`Unique Users: ${this.results.users.size}`);

    if (this.results.periods.size > 0) {
      console.log(`\n📅 PERIODS FOUND:`);
      Array.from(this.results.periods).forEach(period => {
        console.log(`  • ${period}`);
      });
    }

    if (this.results.groups.size > 0) {
      console.log(`\n👥 GROUPS FOUND (first 10):`);
      Array.from(this.results.groups).slice(0, 10).forEach(group => {
        console.log(`  • ${group}`);
      });
      if (this.results.groups.size > 10) {
        console.log(`  ... and ${this.results.groups.size - 10} more`);
      }
    }

    if (this.results.duplicateCount > 0) {
      console.log(`\n⚠️  DUPLICATE ANALYSIS:`);
      console.log(`Users with multiple attempts: ${this.results.duplicateCount}`);
      console.log(`Sample duplicates:`);
      this.results.duplicateDetails.slice(0, 3).forEach(([key, attempts]) => {
        console.log(`  • ${key}: ${attempts.length} attempts`);
        attempts.forEach((attempt, i) => {
          console.log(`    ${i + 1}. Score: ${attempt.combinedScore || attempt.score}, Time: ${attempt.timeTaken}s`);
        });
      });
    }

    if (this.results.schemaIssues.length > 0) {
      console.log(`\n❌ SCHEMA ISSUES (first 5):`);
      this.results.schemaIssues.slice(0, 5).forEach(({ docId, issues }) => {
        console.log(`  • ${docId}: ${issues.join(", ")}`);
      });
    }
  }

  // Method to check specific user/period/group combination
  async checkSpecificCombination(userId, period, groupId = null) {
    console.log(`\n🔍 Checking specific combination:`);
    console.log(`User: ${userId}`);
    console.log(`Period: ${period}`);
    console.log(`Group: ${groupId || 'ALL'}`);

    let q = query(
      collection(db, "test_attempts"),
      where("userId", "==", userId),
      where("twoMonthPeriod", "==", period)
    );

    if (groupId) {
      q = query(q, where("groupId", "==", groupId));
    }

    const snapshot = await getDocs(q);
    console.log(`Found ${snapshot.size} documents for this combination`);

    snapshot.forEach(doc => {
      const data = doc.data();
      console.log(`Document ${doc.id}:`, {
        score: data.score,
        combinedScore: data.combinedScore,
        timeTaken: data.timeTaken,
        finishedAt: data.finishedAt?.toDate?.(),
        groupId: data.groupId,
      });
    });

    return snapshot.size;
  }
}

// Convenience functions for browser console use
export async function diagnosePeriod(period) {
  const diagnostic = new LeaderboardDiagnostic();
  return await diagnostic.diagnose(period);
}

export async function diagnoseGroup(groupId, period = null) {
  const diagnostic = new LeaderboardDiagnostic();
  return await diagnostic.diagnose(period, groupId);
}

export async function diagnoseUser(userId, period, groupId = null) {
  const diagnostic = new LeaderboardDiagnostic();
  return await diagnostic.checkSpecificCombination(userId, period, groupId);
}

// Export for browser console
if (typeof window !== 'undefined') {
  window.leaderboardDiagnostic = {
    diagnose: diagnosePeriod,
    diagnoseGroup,
    diagnoseUser,
    DiagnosticClass: LeaderboardDiagnostic
  };
}
const express = require('express');
const catalyst = require('zcatalyst-sdk-node');

const app = express();
app.use(express.json());

// 1. Basic Health Check Route
app.get('/health', (req, res) => {
	res.status(200).json({
		status: 'success',
		message: 'Crime Analytics backend engine is live.'
	});
});

// 2. Core Analytics Route: Executes ZCQL queries from the front-end
app.post('/analytics/query', async (req, res) => {
	try {
		// Initialize the Catalyst SDK for this specific incoming request
		const catalystApp = catalyst.initialize(req);
		const zcql = catalystApp.zcql();

		const { query } = req.body;
		if (!query) {
			return res.status(400).json({ status: 'error', message: 'No SQL query provided.' });
		}

		// Execute the relational database query
		const queryResult = await zcql.executeZCQLQuery(query);

		res.status(200).json({
			status: 'success',
			data: queryResult
		});
	} catch (error) {
		console.error('Database query failure:', error);
		res.status(500).json({
			status: 'error',
			message: error.message || 'An error occurred while executing the database query.'
		});
	}
});

module.exports = app;
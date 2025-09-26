#!/usr/bin/env node
import React from 'react';
import { render } from 'ink';
import { MultiField } from '../src/plugins/multi/MultiField.js';

function TestApp() {
	return (
		<MultiField
			label="Test search functionality:"
			searchable={true}
			showNumbers={true}
			options={[
				{ value: "react", label: "React" },
				{ value: "vue", label: "Vue.js" },
				{ value: "angular", label: "Angular" },
				{ value: "svelte", label: "Svelte" }
			]}
			onSubmit={(values) => {
				console.log("Selected:", values);
				process.exit(0);
			}}
			onBack={() => process.exit(0)}
		/>
	);
}

render(<TestApp />);
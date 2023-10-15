// ==ClosureCompiler==
// @compilation_level SIMPLE_OPTIMIZATIONS
// @output_file_name default.js
// @language_out ECMASCRIPT_2017
// ==/ClosureCompiler==



// namespace
window.nettools = window['nettools'] || {};





nettools.SQLTableEditor = class {
	
	/**
	 * Class constructor for SQL database backed table editor
	 *
	 * `options` parameter may define the following settings :
	 *   - onAllowDelete : function(string tableName, int rowNumber, object row):Promise ; a callback that returns a resolved Promise if row deletion is allowed, or a rejected Promise if row deletion is denied
	 *   - onSetupGridColumns : function(object[] columns) ; a callback to update default columns definitions automatically set by 'describe' method, if required
	 *   - defaultValues : object ; an object litteral containing default values for new lines
	 *   - noPrimaryKeyEdit : bool ; if set to `true`, primary key columns can't be updated (except when creating a new line)
	 *   - orderBy : string ; optional SQL statement to order rows
     *   - gridEditorClass : function ; constructor of editor class object to use as underlying editor
     *   - gridEditorClassOptions : object ; options object litteral for underlying editor class constructor
	 *
	 * @param HTMLElement node DOM node to put content into
	 * @param string tableName
	 * @param object options Object litteral with miscellaneous parameters for SQL table editor
	 */
	constructor(node, tableName, options = {})
	{
		this.tableName = tableName;
		this.node = node;
		this.columns = [];
		this.editor = null;
		this.pk = [];
		this.options = options;
		
		
		// set parameters default values
		this.setDefaultValues();
	}
	
	
	
	/**
	 * Set parameters default values for missing ones 
	 */
	setDefaultValues()
	{
		// if no user-defined callback to allow/deny row deletion, it's allowed by default
		this.options.onAllowDelete = (this.options.onAllowDelete || function(){ return Promise.resolve()}).bind(this);
		
		
		if ( this.options.onSetupGridColumns )
			this.options.onSetupGridColumns = this.options.onSetupGridColumns.bind(this);
		
		
		// by default, primary key columns can't updated
		if ( this.options.noPrimaryKeyEdit === undefined )
			this.options.noPrimaryKeyEdit = true;
        
        
        // set default underlying grid editor
        if ( !this.options.gridEditorClass )
            this.options.gridEditorClass = nettools.jsGridEditor;
        if ( !this.options.gridEditorClassOptions )
            this.options.gridEditorClassOptions = {};
	}
		
	
	
	/**
	 * Set columns data and options
	 *
	 * @return Promise Returns a Promise resolved when async setup is done and data loaded
	 */
	setup()
	{
		var that = this;
		this.pk = [];
		
		
		// describe table and create editor
		return that.describe()
			.then(function(columns){

				// prepare columns
				that.columns = columns;
				var cols = [];
				columns.forEach(function(col){
					var c = {};

					that.setupColumn(col, c);
					cols.push(c);
				});


				// create editor
                var o = {
					editable : true,
					rowToStringColumns : 'first',
					columns : that.fireOnSetupGridColumns(cols),
					defaultValues : that.options.defaultValues,
					dialog : that.options.dialog,
					onRowInsert : that.onInsert.bind(that),
					onRowDelete : that.onDelete.bind(that),
					onRowChange : that.onChange.bind(that)
				};
                o = Object.assign(o, that.options.gridEditorClassOptions);
                
				that.editor = new that.options.gridEditorClass(that.node, o);
			})

			// then ask for data (async) and put data into table
			.then(that.getData.bind(that))
		
			// the 'then' chain returns a Promise (in fact, the last 'then' call) which is resolved with `undefined` value, when `setData` is done
			.then(that.setData.bind(that))
		
			// chain AFTER setData to update header line (which is created in setData)
			.then(function()
				{
					// update header line to display primary key column(s)
					var pk = that.getPrimaryKeys();
					pk.forEach(function(k)
						{
							var col = that.node.querySelector(`th[data-column='${k}']`);
							col.firstChild.textContent += '\u00a0🔑';
						});
				});
    }
	
	
	
	/**
	 * Call statement to get table structure
	 *
	 * Each column is defined by the following properties :
	 *   - name : string ; column name
	 *   - type : string ; column type as a string : string|int|float|bool
	 *   - dbType : string ; column type as provided by database driver, ex. VARCHAR(40) OR TINYINT
	 *   - primary : bool ; does column belong to this table primary key(s) ?
	 *   - constraint : function(string):bool ; custom callback to validate this column value
	 *
	 * @return Promise Returns a Promise resolved with an array of object litterals describing columns
	 */
	describe()
	{
		throw new Error('Not implemented');
	}
		
	
	
	/**
	 * Setup config data for a column, according to underlying database : sqllite has few types, but mysql has many types and can enforce string lengths on VARCHAR column type
	 *
	 * @param object column Object litteral describing column, as provided in `columns` constructor array parameter
	 * @param object gridColumn Object litteral being constructed to describe column content in the format expected by jsGridEditor
	 */
	setupColumn(column, gridColumn)
	{
		gridColumn.id = column.name;
		gridColumn.type = column.type;
		gridColumn.subTitle = column.dbType || column.type;
		gridColumn.required = column.primary || false;
		gridColumn.validator = column.constraint;
		gridColumn.readonlyEdit = column.primary && this.options.noPrimaryKeyEdit;
	}
	
	
	
	/**
	 * Get a list of primary key columns
	 *
	 * @return string[]
	 */
	getPrimaryKeys()
	{
		// use cache
		if ( this.pk.length )
			return this.pk;
		
		
		this.pk = [];
		var that = this;
		this.columns.forEach(function(col){
			if ( col.primary )
				that.pk.push(col.name);
		});
		
		
		return this.pk;
	}
	
	
	
	/**
	 * Insert a new row
	 */
	insertRow()
	{
		this.editor.insertRow();
	}
	
	
	
	/**
	 * Set data for editor
	 *
	 * @param object[] data Array of object litterals for table content
	 */
	setData(data)
	{
		this.editor.setData(data);
	}
	
	
	
	/**
	 * Perform a SQL SELECT on table
	 *
	 * @param string query
	 * @param string[] values
	 * @return Promise Returns a resolved Promise with an array of object litterals for all rows matched by select statement
	 */
	SQLSelect(query, values = [])
	{
		throw new Error("Not implemented");
	}
	
	
	
	/**
	 * Perform a SQL query on table
	 *
	 * @param string query
	 * @param string[] values
	 * @return Promise Returns a resolved Promise if request OK, or a rejected Promise if request KO
	 */
	SQL(query, values = [])
	{
		throw new Error("Not implemented");
	}
	
	
	
	/**
	 * Call statement to get table content
	 *
	 * @return Promise Returns a resolved Promise with an array of object litterals (one per row)
	 */
	getData()
	{
		// user options.orderBy clause or get a list of primary key column names (usually a PK is a single column, but this is not mandatory)
		var order = this.options.orderBy ? this.options.orderBy : this.getPrimaryKeys().join(',');

		// perform query to get data
		return this.SQLSelect(`SELECT * FROM ${this.tableName} ORDER BY ${order}`);
	}
	
	
	
	/**
	 * Call user-defined options.onAllowDelete callback
	 *
	 * @param int rowNumber
	 * @param object rowData
	 * @return Promise Returns a resolved Promise if row deletion is allowed, or a rejected Promise if row deletion is denied
	 */
	fireOnRowDelete(rowNumber, rowData)
	{
		return this.options.onAllowDelete(this.tableName, rowNumber, rowData);
	}
	
	
	
	/**
	 * Call user-defined options.onSetupGridColumns callback
	 *
	 * @param object[] columns Array of object litterals describing columns
	 */
	fireOnSetupGridColumns(columns)
	{
		if ( typeof this.options.onSetupGridColumns == 'function' )
			this.options.onSetupGridColumns(columns);
		
		return columns;
	}
	
	
	
	/**
	 * Define behavior when updating a row
	 * 
	 * @param int rowNumber Row offset in dataset (first row = 0)
	 * @param object rowData Object litteral with column values for the row
	 * @return Promise Returns a Promise resolved with rowNumber when done
	 */
	onChange(rowNumber, rowData)
	{
		var cols = Object.keys(rowData).map(function(k){ return `${k} = ?`; }).join(',');
		var values = Object.values(rowData);

		
		// get a list of primary key column names (usually a PK is a single column, but this is not mandatory)
		var pk = this.getPrimaryKeys();
		var w = [];
		var that = this;
		pk.forEach(function(col){
			w.push(`${col} = ?`);
			values.push(that.editor.options.data[rowNumber][col]);
		})
		
		
		return new Promise(function(resolve, reject){
			that.SQL(`UPDATE ${that.tableName} SET ${cols} WHERE ${w.join(' AND ')}`, values)
				.then(function(){
					resolve(rowNumber);
				})
				.catch(reject);
		}); 
	}
	
	
	
	/**
	 * Define behavior when deleting a row
	 * 
	 * @param int rowNumber Row offset in dataset (first row = 0)
	 * @param object rowData Object litteral with column values for the row
	 * @return Promise Returns a Promise resolved with rowNumber when done
	 */
	onDelete(rowNumber, rowData)
	{
		var that = this;
		
		return new Promise(function(resolve, reject){
			that.fireOnRowDelete(rowNumber, rowData)
				.then(function()
					{
						// building WHERE clause
						var w = [];
						var wvalues = [];

						// get a list of primary key column names (usually a PK is a single column, but this is not mandatory)
						var pk = that.getPrimaryKeys();
						pk.forEach(function(col){
							w.push(`${col} = ?`);
							wvalues.push(rowData[col]);
						})


						that.SQL(`DELETE FROM ${that.tableName} WHERE ${w.join(' AND ')}`, wvalues)
							.then(function(){
								resolve(rowNumber);
							})
							.catch(reject);
					})
				.catch(function(e)
					{
						// if an error occured, reject Promise so that the error message is displayed
						if ( typeof e == 'object' )
							reject(e);
                        else
                            // otherwise, user-defined `options.onAllowDelete` has refused deletion and rejected the Promise
                            that.editor.options.dialog.alert(nettools.SQLTableEditor.i18n.ROW_DELETION_DENIED);
					});
		});
	}
	
	
	
	/**
	 * Define behavior when inserting a row
	 * 
	 * @param int rowNumber Row offset in dataset (first row = 0)
	 * @param object rowData Object litteral with column values for the row
	 * @return Promise Returns a Promise resolved with rowNumber when done
	 */
	onInsert(rowNumber, rowData)
	{
		var cols = '(' + Object.keys(rowData).join(',') + ')';
		var values = Object.values(rowData);
		var qmarks = '?,'.repeat(values.length-1) + '?';
		
		var that = this;
		return new Promise(function(resolve, reject){
			that.SQL(`INSERT INTO ${that.tableName} ${cols} VALUES (${qmarks})`, values)
				.then(function(){
					resolve(rowNumber);
				})
				.catch(reject);
		});
	}	
}
	









nettools.SqlLiteTableEditor = class extends nettools.SQLTableEditor {

	/**
	 * Class constructor for SqlJs table editor
	 *
	 * @param SQL.Database db Database object from SqlJs
	 * @param HTMLElement node DOM node to put content into
	 * @param string tableName
	 * @param object options Object litteral with miscellaneous parameters for SQL table editor
	 */
	constructor(db, node, tableName, options = {})
	{
		super(node, tableName, options);
		
		
		this.db = db;
	}
	
		
	
	/**
	 * Static function to normalize SqlLite database type to library types
	 *
	 * @param string dbType Database type as returned by PRAGMA statement
	 * @return string Returns column type as a string : string|int|number|float|bool
	 */	
	static normalizeType(dbType)
	{
		switch ( dbType.toLowerCase() )
		{
			case 'integer':
				return 'int';
				
			case 'real':
				return 'float';
				
			default:
				return 'string';
		}
	}
	
	
	
	/**
	 * Perform a SQL query on table
	 *
	 * @param string query
	 * @param string[] values
	 * @return Promise Returns a resolved Promise if request OK, or a rejected Promise if request KO
	 */
	SQL(query, values = [])
	{
		try
		{
			this.db.run(query, values);
			return Promise.resolve();
		}
		catch ( e )
		{
			return Promise.reject(e);
		}
	}
	
	
	
	/**
	 * Perform a SQL Select on table
	 *
	 * @param string query
	 * @param string[] values
	 * @return Promise Returns a resolved Promise with an array of object litterals for all rows matched by select statement
	 */
	SQLSelect(query, values = [])
	{
		try
		{
			var rows = [];
			var stmt = this.db.prepare(query, values);
			while ( stmt.step() )
				rows.push(stmt.getAsObject());

			stmt.free();
			
			return Promise.resolve(rows);
		}
		catch ( e )
		{
			return Promise.reject(e);
		}
	}
	
	
	
	/**
	 * Call statement to get table structure
	 *
	 * Each column is defined by the following properties :
	 *   - name : string ; column name
	 *   - type : string ; column type as a string : string|int|float|bool
	 *   - dbType : string ; column type as provided by database driver, ex. VARCHAR(40) OR TINYINT
	 *   - primary : bool ; does column belong to this table primary key(s) ?
	 *   - constraint : function(string):bool ; custom callback to validate this column value
	 *
	 * @return Promise Returns a Promise resolved with an array of object litterals describing columns
	 */
	describe()
	{
		try
		{
			/*
				[
				  {columns:['a','b'], values:[[0,'hello'],[1,'world']]}
				]

				cid	name		type	notnull	dflt_value	pk
				0	id			INTEGER	0					1
				1	name		TEXT	0					0
				2	city		TEXT	0					0
				3	department	TEXT	0					0
				4	salary		INTEGER	0					0			
			*/
			var stmt = this.db.prepare(`PRAGMA table_info([${this.tableName}])`);

			// for all rows = all table columns (1 row = 1 column def)
			var cols = [];
			while ( stmt.step() )
			{
				var row = stmt.getAsObject();
				cols.push({
					name : row.name,
					dbType : row.type,
					type : this.constructor.normalizeType(row.type),
					primary : row.pk				
				});
			}

			stmt.free();


			return Promise.resolve(cols);
		}
		catch ( e )
		{
			return Promise.reject(e);
		}
	}
}









nettools.PdoTableEditor = class extends nettools.SQLTableEditor {

	/**
	 * Class constructor for PDO table editor
	 *
	 * @param nettools.PdoServerInterface serverInterface User defined strategy pattern for sending SQL commands to server
	 * @param HTMLElement node DOM node to put content into
	 * @param string tableName
	 * @param object options Object litteral with miscellaneous parameters for SQL table editor
	 */
	constructor(serverInterface, node, tableName, options = {})
	{
		super(node, tableName, options);
		
		
		this.serverInterface = serverInterface;
        
		
		// define options.onAllowDelete callback to send request to server-side ; when receiving answer, as a Promise resolved by true or false, we resolve the returned Promise or reject it
		// if an error occured, the returned Promise is also rejected, but with an Error object as value
        var that = this;
		this.options.onAllowDelete = function(tableName, rowNumber, row)
            {
                return new Promise(function(resolve, reject){
                        that.serverInterface.onAllowDelete(tableName, rowNumber, row)
                            .then(function(b){
                                if ( b == true )
                                    resolve();
                                else
                                    reject();
                            })
                            .catch(reject);
                    });
            };
	}
	
		
	
	/**
	 * Perform a SQL query on table
	 *
	 * @param string query
	 * @param string[] values
	 * @return Promise Returns a resolved Promise if request OK, or a rejected Promise if request KO
	 */
	SQL(query, values)
	{
		try
		{
			return this.serverInterface.execute(query, values);
		}
		catch ( e )
		{
			return Promise.reject(e);
		}
	}
	
	
	
	/**
	 * Perform a SQL Select on table
	 *
	 * @param string query
	 * @param string[] values
	 * @return Promise Returns a resolved Promise with an array of object litterals for all rows matched by select statement
	 */
	SQLSelect(query, values = [])
	{
		try
		{
			return this.serverInterface.select(query, values);
		}
		catch ( e )
		{
			return Promise.reject(e);
		}
	}
}









nettools.MysqlPdoTableEditor = class extends nettools.PdoTableEditor {
	
	/**
	 * Call statement to get table structure
	 *
	 * Each column is defined by the following properties :
	 *   - name : string ; column name
	 *   - type : string ; column type as a string : string|int|float|bool
	 *   - dbType : string ; column type as provided by database driver, ex. VARCHAR(40) OR TINYINT
	 *   - primary : bool ; does column belong to this table primary key(s) ?
	 *   - constraint : function(string):bool ; custom callback to validate this column value
	 *
	 * @return Promise Returns a Promise resolved with an array of object litterals describing columns
	 */
	describe()
	{
		/*
			+-------------+----------+------+-----+---------+----------------+
			| Field       | Type     | Null | Key | Default | Extra          |
			+-------------+----------+------+-----+---------+----------------+
			| ID          | int(11)  | NO   | PRI | NULL    | auto_increment |
			| Name        | char(35) | NO   |     |         |                |
			| CountryCode | char(3)  | NO   | MUL |         |                |
			| District    | char(20) | NO   |     |         |                |
			| Population  | int(11)  | NO   |     | 0       |                |
			+-------------+----------+------+-----+---------+----------------+
		*/
		var that = this;

		return new Promise(function(resolve, reject)
			{
				try
				{
					that.SQLSelect(`DESCRIBE ${that.tableName}`).then(
						function(columns){
							// for all rows = all table columns (1 row = 1 column def)
							var cols = [];
							columns.forEach(
								function(row)
								{
									cols.push({
										name : row.Field,
										dbType : row.Type,
										type : that.constructor.normalizeType(row.Type),
										primary : (row.Key == 'PRI')
									});
								}
							);
							
							
							// add constraint for mysql types with size/precision
							that.setupConstraints(cols);
							
							
							// table is now described, resolving Promise
							resolve(cols);
							
						}).catch(reject);
				}
				catch ( e )
				{
					reject(e);
				}
			});
	}

	
	
	/**
	 * Set column constraints
	 *
	 * @param object[] columns Column values as object litterals for all rows 
	 */
	setupConstraints(columns)
	{
		// define constraint callbacks to check max allowed values according to dbType
		columns.forEach(function(col){

			// get type and display size ; regs[0]=full match, regs[1]=type, regs[2]=size/precision, regs[3]=scale, for decimal(precision,scale) type
			var regs = col.dbType.match(/([a-z]+)\(([0-9]+)(?:,([0-9]+))?\)/);
			
			// if simple dbType, with no size, don't do anything
			if ( !regs )
				return;
			
			
			// if dbType with size (and scale ?)
			switch ( regs[1] )
			{
				case 'varchar':
				case 'char':
					col.constraint = function(val){ return val.length <= parseInt(regs[2]) };
					break;
					
				case 'tinyint':
					col.constraint = function(val){ return (val >= -128) && (val <= 127); };
					break;
					
				case 'smallint':
					col.constraint = function(val){ return (val >= -32768) && (val <= 32767); };
					break;
					
				case 'mediumint':
					col.constraint = function(val){ return (val >= -8388608) && (val <= 8388607); };
					break;

				case 'int':
					col.constraint = function(val){ return (val >= -2147483648) && (val <= 2147483647); };
					break;

				case 'bigint':
					break;
					
				case 'decimal':
				case 'numeric':
					var precision = regs[2];
					var scale = regs[3];
					
					if ( !scale )
						col.constraint = function(val) { return new RegExp(`^[0-9]{1,${precision}}$`).test(val); };
					else
						col.constraint = function(val) { return new RegExp(`^[0-9]{1,${precision-scale}}\.[0-9]{1,${scale}}$`).test(val); };
					
					break;
			}
			
		});
	}
	
	
	
	/**
	 * Static function to normalize mysql database types to library types
	 *
	 * @param string dbType Database type as returned by mysql DESCRIBE statement
	 * @return string Returns column type as a string : string|int|number|float|bool
	 */	
	static normalizeType(dbType)
	{
		if ( dbType.toLowerCase() == 'tinyint(1)' )
			return 'bool';
		
		switch ( dbType.toLowerCase().replace(/\([0-9,]+\)/g, '') )
		{
			case 'integer':
			case 'int':
			case 'smallint':
			case 'mediumint':
			case 'tinyint':
			case 'bigint':
				return 'int';
				
			case 'decimal':
			case 'numeric':
			case 'float':
			case 'double':
				return 'float';
				
			default:
				return 'string';
		}
	}
	
}








nettools.PdoServerInterface = class {
	
	/**
	 * Send a SQL query described in payload object litteral
	 *
	 * @param object payload
	 * @return Promise Returns a promise resolved if query OK ; resolved value depends on request or query statement and noResponse parameter
	 */
	send(payload)
	{
		throw new Error('Not implemented');
	}
	
	
	
	/**
	 * Send a request to server-side to test if a row can be deleted (we may detect foreign key values)
	 *
	 * @param string tableName
	 * @param int rowNumber
	 * @param object row
	 * @return Promise Returns a Promise resolved by true or false, depending of whether the row can be deleted or not, or a rejected Promise if an error occured
	 */
	onAllowDelete(tableName, rowNumber, row)
	{
		return this.send({
			type : 'request',
			request : 'allowDelete',
			noResponse : false,
			body : JSON.stringify({
				tableName : tableName,
				rowNumber : rowNumber,
				row : row
			})
		});
	}
	
	

	/**
	 * Perform a SQL query on table
	 *
	 * @param string query
	 * @param string[] values
	 * @return Promise Returns a resolved Promise if request OK, or a rejected Promise if request KO
	 */
	execute(query, values = [])
	{
		return this.send({
				type : 'query',
				request : query,
				body : JSON.stringify(values),
				noResponse : true
			});
	}
	
	
	
	/**
	 * Perform a SQL select on table
	 *
	 * @param string query
	 * @param string[] values
	 * @return Promise Returns a resolved Promise with an array of object litterals for all rows matched by select statement
	 */
	select(query, values = [])
	{
		return this.send({
				type : 'query',
				request : query,
				body : JSON.stringify(values),
				noResponse : false
			});
	}
}








nettools.DatabaseEditor = class {
	
	
	/**
	 * Constructor for database editor, making it possible to select a table (among a user-defined list) to edit
	 *
	 * @param string[] tableList List of table names the user is allowed to select for edit
	 * @param HTMLElement node Top container for database editor GUI
	 * @param function editorClass Constructor for editor class (inheriting from nettools.SQLTableEditor) ; use `.bind` to assign parameters not declared in nettools.SQLTableEditor constructor
	 * @param object editorClassOptions Miscellaneous parameters (passed to `editorClass` constructor as last argument)
	 */
	constructor(tableList, node, editorClass, editorClassOptions = {})
	{
		this.tableList = tableList;
		this.editorClass = editorClass;
		this.editorClassOptions = editorClassOptions;
		this.node = node;
		this.editor = null;
		this.editorNode = null;
		
		
		this.output();
	}
	
	
	
	/**
	 * Apply CSS on created tags
	 */
	applyCSS()
	{
		this.node.classList.add('jsDatabaseEditor');		
	}
	

	
	/**
	 * Display GUI for database editor
	 */
	output()
	{
		var items = this.tableList.map(function(t){ return `<option value="${t}">${t}</option>`; }).join('');
		
		
		// create GUI content
		this.node.innerHTML = 
`<div class="uiForm tableSelect">
	<label>${nettools.DatabaseEditor.i18n.TABLE_SELECT}<select><option></option>${items}</select></label>
	-
	<a href="javascript:void(0)">${nettools.DatabaseEditor.i18n.TABLE_RELOAD}</a>
</div>
<div></div>`;
		
		
		// onchange event on table select
		var that = this;
		var select = this.node.querySelector('select');
		select.onchange = function()
			{
				that.select(select.value);
			};
		
		
		// set event for reload link
		this.node.querySelector('div.tableSelect a:nth-of-type(1)').onclick = select.onchange;
		
		
		// set target node for editor
		this.editorNode = this.node.querySelector('div:nth-of-type(2)');
		
		
		// apply css format
		this.applyCSS();
	}
	
	
	
	/**
	 * React to table selection and open table editor
	 * 
	 * @param string table
	 * @return Promise Returns a Promise resolved when editor setup is done
	 */
	select(table)
	{
		if ( table )
		{
			this.editor = new this.editorClass(this.editorNode, table, this.editorClassOptions);
			return this.editor.setup();
		}
		else
		{
			this.editor = null;
			this.editorNode.innerHTML = '';
			return Promise.resolve();
		}
	}
	
}








/**
 * Translations
 */
nettools.SQLTableEditor.i18n = {
    ROW_DELETION_DENIED : 'Row deletion has been denied by server-side'
}


nettools.DatabaseEditor.i18n = {
    TABLE_SELECT : 'Table selection : ',
	TABLE_RELOAD : 'Reload table'
}


# net-tools/js-db-editor

## Composer library with a Javascript database editor

Two kind of db editors can be used :

- an editor making it possible to choose which table we want to edit (either user-selected of hard-coded)

- an editor making it possible to edit some config values inside a given table


In either cases, type format for columns/values and mandatory values can be enforced.



## Setup instructions

To install net-tools/js-db-editor package, just require it through composer : `require net-tools/js-db-editor:^1.0.0`.





## How to use ?

### SqlLiteTableEditor (sqljs-editor.html sample)

The library provides two table editors, one for a SqlJs database (a db engine hosted on client browser), one for a Mysql PDO database (the db is hosted on a remote server, accessed through PHP script).

`SqlLiteTableEditor` is a Javascript class to create a SqlJs editor for a given table.

The constructor expects the following data :
- the previously created `SQL.Database` object, from sql-wasm.js lib
- the `HTMLElement` node where the editor must be rendered (usually a DIV)
- the name of table to edit
- the options, as an object litteral
  + `onAllowDelete` : a function called upon row deletion ; return a resolved Promise if row can be deleted, or a rejected Promise if row can't be deleted ; by default, all rows can be deleted
  + `onSetupGridColumns` : a function making it possible to update columns setup (a column can be marked as readonly, required, etc. ; see `net-tools/js-grid-editor` for available values)
  + `gridEditorOptions` : a nested object litteral with options for underlying grid editor (row default values can be provided here ; see `net-tools/js-grid-editor` constructor `options` argument for available values)
  + `noPrimaryKeyEdit` : if set to true, the primary key column can't be modified (except when creating a new line)
  + `orderBy` : some SQL string to append to request so that rows displayed are in the correct order


```javascript
var	grid = new nettools.SqlLiteTableEditor(
	// database of type SQL.Database ; see sample for db object construction
	db,

	// node
	document.getElementById('table'),

	// table name
	'Product',

	// options
	{
		onAllowDelete : function(rowNumber, row)
			{
				// for the sample, refusing to remove odd lines
				if ( rowNumber % 2 == 0 )
					return Promise.resolve();
				else
					return Promise.reject();
			},


		onSetupGridColumns : function(columns)
			{
				// set second column as readonly
				columns[1].readonly = true;
			},


		gridEditorOptions : {
			defaultValues : { name:'unknown name', price:'999.99'}
		}
	}
);
```

When `grid` object is ready, the `setup` method should be called to initialize data :

```javascript
grid.setup()
	.then(function(){ /* here some code to chain with when setup is done */ })
	.catch(function(e){
		// error handling during setup
		alert(e.message ? e.message : e);
	});	
```

Don't remove the `catch` statement ; if you remove it, errors won't be displayed.




### MysqlPdoTableEditor (pdo-editor.html sample)

For Mysql PDO editor, we use a new class inheriting from class `nettools.PdoServerInterface` which defines entry points for server side dialog with database.

The `MysqlPdoTableEditor` editor constructor expects the following parameters :
- an object inheriting from `nettools.PdoServerInterface` class and implementing the `send` method
- the `HTMLElement` node where the editor must be rendered (usually a DIV)
- the name of table to edit


```javascript
var grid = new nettools.MysqlPdoTableEditor(

	// database link
	intf,

	// node
	document.getElementById('table'),

	// table name
	'Product'
);
```

The object expected as first parameter must be created from a user-defined class which inherits from `nettools.PdoServerInterface` ; its `send` method implements the dialog between javascript and server-side. 
The sample provides a simple object using XmlHttpRequest to send queries to server-side. You may customize the `send` method to add any security layer required (no security in sample code).
Also, this user-defined class has a constructor with a bool value ; if set to true, the data sent back to browser (such as *select* statements) will be compressed to save bandwidth.

When `grid` object is ready, the `setup` method should be called to initialize data :

```javascript
grid.setup()
	.then(function(){ /* here some code to chain with when setup is done */ })
	.catch(function(e){
		// error handling during setup
		alert(e.message ? e.message : e);
	});	
```

Don't remove the `catch` statement ; if you remove it, errors won't be displayed.




### DatabaseEditor (database-editor.html sample)

The library also defines a class that creates the GUI required for the user to select among a list of tables, and the selected table can be edited (with either `MysqlPdoTableEditor` or `SqlLiteTableEditor`).

The `DatabaseEditor` class constructor expects as parameters :
- a table list 
- the `HTMLElement` node where the editor must be rendered (usually a DIV)
- the class constructor to use as grid editor (`SqlLiteTableEditor` or `MysqlPdoTableEditor`) ; first parameter of either grid editor must be bound to the constructor as seen in sample below

```javascript
var dbeditor = new nettools.DatabaseEditor(
	// table list
	['Product', 'Color'],

	// node
	document.getElementById('dbeditor'),

	// database of type SQL.Database
	nettools.SqlLiteTableEditor.bind(null, db)
);	
```

There's not `setup` method to call, the GUI is created on-the-fly.




### DbConfigEditor (dbconfig-editor.html sample)

The `DbConfigEditor` class makes it possible to edit config values stored inside a table. The database can be a SqlJs database (edited thanks to `SqlLiteTableEditor` editor) or a server hosted database (through `MysqlPdoTableEditor` editor).

The table can have any required columns, but 3 are mandatory : *id* (as primary key), *metadata* (stores data about expected value type), *value* ; those are default names, custom names can be used.

The *data* column store the config value ; thanks to *metadata* column, we can enforce its type (text, numeric, bool), ensure it's not omitted, and use specific value editors (for HTML values or multiline strings).
The *metadata* column value is defined for each row (ie each config value) through a GUI metadata editor window.

The `DbConfigEditor` class constructor expects the following parameters :
- the name of config table to edit
- the `HTMLElement` node where the editor must be rendered (usually a DIV)
- an object litteral with options values for class : 
  + metadataColumn : the name of metadata column (default is 'metadata')
  + valueColumn : the name of value column (default is 'value')
  + primaryKeyColumn : the name of primary key column (default is 'key')
  + defaultSeparator : a character used to separate data in enum values (default to ';')
  + lineLength : when a line with metadata value type of 'html' or 'longtext' exceeds this length, the output is truncated and (...) displayed
  + dialogObject : a reference to class constructor `nettools.ui.desktop.dialog` (default)
  + requiredColumns : an array of column names that are mandatory (other than primary key column, always mandatory, and value columns, which mandatory behavior is enforced by `metadata.required` property)
- the class constructor inheriting from `nettools.SQLTableEditor` class (either `SqlLiteTableEditor` or `MysqlPdoTableEditor`) ; remember to bind any first constructor argument not declared in `nettools.SQLTableEditor` constructor
- an object litteral with options for the class constructor passed as previous parameter


```javascript
var grid = new nettools.DbConfigEditor(
	// table config name
	'Config',

	// node
	document.getElementById('table'),

	// options
	{
		metadataColumn : 'metadata',
		valueColumn : 'value',
		primaryKeyColumn : 'id',
		requiredColumns : ['namespace']
	},

	// SQLTableEditor class, db connection is bound to constructor

	nettools.SqlLiteTableEditor.bind(null, db),

	// SQLTableEditor options
	{
		orderBy : 'id DESC',				

		// underlying jsGridEditor options
		gridEditorOptions : {
			defaultValues : {namespace:'test'}
		}					

	}
);
```

In this sample, the database refered by `db` has a *config* table with *id*, *metadata*, *namespace* and *value* columns.

To display the GUI editor :

```javascript
grid.setup()
	.then(function(){ /* here some code to chain with when setup is done */ })
	.catch(function(e){
		// error handling during setup
		alert(e.message ? e.message : e);
	});	
```

Please refer to sample to see how `db` connection is created.




## Samples

There are several samples inside `/samples` subdirectory :

- **sqljs-editor.html** : a database editor sample, where database is implemented with SqlJs (sql-wasm provided)
- **pdo-editor.html** : a database editor sample, where database is accessed through a server-side PHP script with PDO statements (only db connection is required ; your hosted Mysql database must have a `Product` table to run the sample)
- **database-editor.html** : a sample where, given a list of available tables for edit, the user select a table and then can edit the selected table
- **dbconfig-editor.html** : this sample shows how to store config values inside a table with only 3 required columns (`id`, `metadata`, `value` ; names can be modified) ; depending of the kind of value expected, edits can be simple text, numeric values, bool values, long-text (multiline), html with wysiwyg editor


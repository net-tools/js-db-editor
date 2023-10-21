# net-tools/js-db-editor

## Composer library with a Javascript database editor

Two kind of db editors can be used :

- an editor making it possible to choose which table we want to edit (either user-selected of hard-coded)

- an editor making it possible to edit some config values inside a given table


In either cases, type format for columns/values and mandatory values can be enforced.



## Setup instructions

To install net-tools/js-db-editor package, just require it through composer : `require net-tools/js-db-editor:^1.0.0`.





## How to use ?

### SqlLiteTableEditor (sqljs-editor.html)

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




### MysqlPdoTableEditor (pdo-editor.html)

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




### DatabaseEditor (database-editor.html)

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




## Samples

There are several samples inside `/samples` subdirectory :

- **sqljs-editor.html** : a database editor sample, where database is implemented with SqlJs (sql-wasm provided)
- **pdo-editor.html** : a database editor sample, where database is accessed through a server-side PHP script with PDO statements (only db connection is required ; your hosted Mysql database must have a `Product` table to run the sample)
- **database-editor.html** : a sample where, given a list of available tables for edit, the user select a table and then can edit the selected table
- **dbconfig-editor.html** : this sample shows how to store config values inside a table with only 3 required columns (`id`, `metadata`, `value` ; names can be modified) ; depending of the kind of value expected, edits can be simple text, numeric values, bool values, long-text (multiline), html with wysiwyg editor


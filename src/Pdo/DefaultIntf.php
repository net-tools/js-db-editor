<?php

namespace Nettools\JsDbEditor\Pdo;





abstract class DefaultIntf {
	
	protected $pdo = null;
	
	
	
	/**
	 * Constructor
	 *
	 * @param PDO $pdo
	 */
	function __construct(\PDO $pdo)
	{
		$this->pdo = $pdo;
	}

	
	
	/**
	 * Send response 
	 *
	 * @param bool $status
	 * @param mixed $body Response sent to client-side
	 * @param bool $compress Set $compress to True to answer with compressed content
	 * @return mixed Returns response body with status flag and body content
	 */	
	abstract function response($status, $body = null, $compress = false);
	
	
	
	/**
	 * Get request value (usually through $_POST superglobal)
	 *
	 * @param string $key Value name to get
	 * @return string
	 */
	abstract function getRequestValue($key);
	
	
	
	/**
	 * Test if a row can be deleted
	 *
	 * @param object $body Request body as json object with 'tableName', 'rowNumber', 'row' properties
	 * @return bool
	 */
	function allowDelete($body)
	{
		return true;
	}
	
	
	
	/**
	 * Execute a SQL request 
	 *
	 * @param string $query SQL query
	 * @param string[] $values Array of values to bind to placeholders in $query
	 * @param bool $noResponse Set this to TRUE if no response required
	 * @param bool $compress Must response be compressed ?
	 * @return mixed Returns response body with status flag and body content
	 */
	function query($query, $values, $noResponse, $compress)
	{
		try
		{
			// if request expects a response
			if ( !$noResponse )
			{
				$st = $this->pdo->prepare($query);
				$st->execute($values);
				$rows = $st->fetchAll(\PDO::FETCH_OBJ);

				return $this->response(true, $rows, $compress);
			}
			else
			{
				$this->pdo->prepare($query)->execute($values);
				return $this->response(true);
			}
			
		}
		catch( \Throwable $e )
		{
			return $this->response(false, $e->getMessage());
		}
	}
	
	
	
	/**
	 * Execute a simple request with true/false response
	 *
	 * @param string $req Request name
	 * @param object $body 
	 * @param bool $noResponse Set this to TRUE if no response required
	 * @param bool $compress Must response be compressed ?
	 * @return mixed Returns response body with status flag and body content
	 */
	function request($req, $body, $noResponse, $compress)
	{
		try
		{
			// call method in $req
			$r = $this->$req($body);
			
			// if request expects a response
			if ( !$noResponse )
				return $this->response(true, $r, $compress);
			else
				return $this->response(true);
		}
		catch( \Throwable $e )
		{
			return $this->response(false, $e->getMessage());
		}
	}
	
	
	
	/**
	 * Main entry point : execute a SQL request with $_REQUEST data, through PDO, and get rows
	 *
	 * @return mixed Returns response body with status flag and body content
	 */
	function execute()
	{
		try
		{
			$type = $this->getRequestValue('type');

			return $this->$type($this->getRequestValue('request'), json_decode($this->getRequestValue('body')), $this->getRequestValue('noResponse'), $this->getRequestValue('compress'));
		}
		catch( \Throwable $e )
		{
			return $this->response(false, $e->getMessage());
		}
	}
}









?>
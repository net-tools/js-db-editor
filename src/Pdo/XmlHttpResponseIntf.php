<?php

namespace Nettools\JsDbEditor\Pdo;






class XmlHttpResponseIntf extends DefaultIntf {
	
	/**
	 * Get request value (usually through $_POST superglobal)
	 *
	 * @param string $key Value name to get
	 * @return string
	 */
	function getRequestValue($key)
	{
		if ( array_key_exists($key, $_POST) )
			return $_POST[$key];
		else
			return $this->response(false, "Key '$key' does not exist in request POST body");
	}
	
	
	
	/**
	 * Send response as JSON through xmlhttp response stream
	 *
	 * @param bool $status
	 * @param mixed $body Value(s) to return to client-side
	 * @return mixed Returns response body with status flag and body content
	 */	
	function response($status, $body = null)
	{
		// send xmlhttprequest response headers
		header("Content-Type: application/json; charset=utf-8");
		header("Expires: Sat, 1 Jan 2005 00:00:00 GMT");
		header("Last-Modified: ".gmdate( "D, d M Y H:i:s")." GMT");
		header("Cache-Control: no-cache, must-revalidate");
		header("Pragma: no-cache");	


		$json = json_encode($body);


		if ( $status )
			die("{\"status\":true, \"responseBody\":$json}");
		else
			die("{\"status\":false, \"message\":$json}");
	}

}
	






?>
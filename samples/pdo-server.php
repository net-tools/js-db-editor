<?php

ini_set('display_errors', 'stdout');


include "../src/Pdo/DefaultIntf.php";
include "../src/Pdo/XmlHttpResponseIntf.php";


class SampleIntf extends \Nettools\JsDbEditor\Pdo\XmlHttpResponseIntf
{
	/**
	 * Test if a row can be deleted
	 *
	 * @param object $body
	 * @return bool
	 */
	function allowDelete($body)
	{
		return $body->rowNumber % 2 == 0;
	}
}




$dbserv = $_POST['db'];
$dbuser = $_POST['user'];
$dbpass = $_POST['password'];


$pdo = new PDO("mysql:host={$dbserv};dbname={$dbuser};charset=UTF8", $dbuser, $dbpass);
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);


$intf = new SampleIntf($pdo);
$intf->execute();



?>
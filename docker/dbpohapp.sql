-- MySQL dump 10.13  Distrib 8.0.36, for macos14 (arm64)
--
-- Host: localhost    Database: db-pohapp
-- ------------------------------------------------------
-- Server version	9.1.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `autor`
--

DROP TABLE IF EXISTS `autor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `autor` (
  `idautor` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) DEFAULT NULL,
  `apellido` varchar(50) DEFAULT NULL,
  `nacimiento` date DEFAULT NULL,
  `ciudad` varchar(50) DEFAULT NULL,
  `pais` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`idautor`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `autor`
--

LOCK TABLES `autor` WRITE;
/*!40000 ALTER TABLE `autor` DISABLE KEYS */;
INSERT INTO `autor` VALUES (1,'Por','Defecto','1995-06-07','Capiatá ','Paraguay '),(18,'Andrés','Vera','1995-06-07','Capiatá ','Paraguay '),(19,'Andrés ','Vera','1995-06-07','Capiatá ','Paraguay '),(20,'Andrés ','Vera','1995-06-07','Capiatá ','Paraguay'),(21,'','','2022-07-26','','text'),(22,'','','2022-07-26','text','text'),(23,'Andrés ','Vera','2022-07-28','Capiatá ','Paraguay '),(24,'text','text','2022-07-31','text','text'),(25,'text','text','2022-07-31','','');
/*!40000 ALTER TABLE `autor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dolencias`
--

DROP TABLE IF EXISTS `dolencias`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dolencias` (
  `iddolencias` int NOT NULL AUTO_INCREMENT,
  `descripcion` varchar(200) NOT NULL,
  `estado` varchar(2) NOT NULL,
  PRIMARY KEY (`iddolencias`),
  UNIQUE KEY `descripcion_UNIQUE` (`descripcion`)
) ENGINE=InnoDB AUTO_INCREMENT=63 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dolencias`
--

LOCK TABLES `dolencias` WRITE;
/*!40000 ALTER TABLE `dolencias` DISABLE KEYS */;
INSERT INTO `dolencias` VALUES (13,'text','AC'),(20,'Irritación intestinal','AC'),(21,'Hinchazón abdominal','AC'),(22,'Transtornos digestivos','AC'),(25,'Vómito','AC'),(26,'Náuseas','AC'),(27,'Contracción del miocardio','AC'),(28,'Py`a hai - Acidez estomacal','AC'),(29,'Dolor de garganta','AC'),(30,'Problemas digestivos','AC'),(31,'Gripe, resfríos y congestión nasal ','AC'),(32,'Mal aliento','AC'),(33,'Migraña dolor de cabeza','AC'),(34,'Estreñimiento','AC'),(35,'Síntomas de menopausia ','AC'),(39,'Fiebre','AC'),(46,'Dolor de barriga - Alteración de tracto gastrointestinal','AC'),(47,'Dolores articulares','AC'),(48,'Problema en la circulación de la sangre','AC'),(49,'Retención de líquido','AC'),(50,'Afecciones a la piel','AC'),(51,'Tos irritativa','AC'),(52,'Catarro','AC'),(53,'Depresion inmunitaria','AC'),(54,'Gastritis y ulceras estomacales','AC'),(55,'Control de presion arterial','AC'),(56,'Relajante','AC'),(57,'Insomnio','AC'),(58,'Ansiedad','AC'),(59,'Dolores menstruales','AC'),(60,'Desinflamante','AC'),(61,'Relaja el sistema nervioso','AC'),(62,'Alivia colicos y gases','AC');
/*!40000 ALTER TABLE `dolencias` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `dolencias_poha`
--

DROP TABLE IF EXISTS `dolencias_poha`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `dolencias_poha` (
  `iddolencias` int NOT NULL,
  `idpoha` int NOT NULL,
  `idusuario` varchar(200) NOT NULL,
  PRIMARY KEY (`iddolencias`,`idpoha`,`idusuario`),
  KEY `fk_dolencias_has_poha_dolencias1_idx` (`iddolencias`),
  KEY `fk_dolencias_poha_poha1_idx` (`idpoha`,`idusuario`),
  CONSTRAINT `fk_dolencias_has_poha_dolencias1` FOREIGN KEY (`iddolencias`) REFERENCES `dolencias` (`iddolencias`),
  CONSTRAINT `fk_dolencias_poha_poha1` FOREIGN KEY (`idpoha`, `idusuario`) REFERENCES `poha` (`idpoha`, `idusuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `dolencias_poha`
--

LOCK TABLES `dolencias_poha` WRITE;
/*!40000 ALTER TABLE `dolencias_poha` DISABLE KEYS */;
INSERT INTO `dolencias_poha` VALUES (20,20,'34D9bCXRw6eFCR1rA6iIg3IghwV2'),(21,20,'34D9bCXRw6eFCR1rA6iIg3IghwV2'),(21,36,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(22,20,'34D9bCXRw6eFCR1rA6iIg3IghwV2'),(25,21,'34D9bCXRw6eFCR1rA6iIg3IghwV2'),(26,21,'34D9bCXRw6eFCR1rA6iIg3IghwV2'),(27,21,'34D9bCXRw6eFCR1rA6iIg3IghwV2'),(28,21,'34D9bCXRw6eFCR1rA6iIg3IghwV2'),(29,21,'34D9bCXRw6eFCR1rA6iIg3IghwV2'),(30,22,'34D9bCXRw6eFCR1rA6iIg3IghwV2'),(30,30,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(30,31,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(30,32,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(30,33,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(31,22,'34D9bCXRw6eFCR1rA6iIg3IghwV2'),(31,32,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(33,22,'34D9bCXRw6eFCR1rA6iIg3IghwV2'),(34,22,'34D9bCXRw6eFCR1rA6iIg3IghwV2'),(35,22,'34D9bCXRw6eFCR1rA6iIg3IghwV2'),(39,32,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(46,25,'1'),(47,25,'1'),(47,30,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(48,25,'1'),(49,25,'1'),(50,25,'1'),(51,25,'1'),(53,30,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(54,30,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(55,30,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(56,31,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(57,31,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(58,31,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(59,31,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(60,32,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(61,33,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(62,33,'ULWtPfXaBtPgGJpfxfiolyRYprX2');
/*!40000 ALTER TABLE `dolencias_poha` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `planta`
--

DROP TABLE IF EXISTS `planta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `planta` (
  `idplanta` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(200) NOT NULL,
  `descripcion` varchar(600) NOT NULL,
  `estado` varchar(2) NOT NULL,
  `img` varchar(300) DEFAULT NULL,
  `nombre_cientifico` varchar(255) DEFAULT NULL,
  `familia` varchar(255) DEFAULT NULL,
  `subfamilia` varchar(255) DEFAULT NULL,
  `habitad_distribucion` varchar(600) DEFAULT NULL,
  `ciclo_vida` varchar(255) DEFAULT NULL,
  `fenologia` varchar(600) DEFAULT NULL,

  PRIMARY KEY (`idplanta`),
  UNIQUE KEY `nombre_UNIQUE` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;


--
-- Dumping data for table `planta`
--

LOCK TABLES `planta` WRITE;
/*!40000 ALTER TABLE `planta` DISABLE KEYS */;

INSERT INTO `planta` (
  `idplanta`,
  `nombre`,
  `descripcion`,
  `estado`,
  `img`,
  `nombre_cientifico`,
  `familia`,
  `subfamilia`,
  `habitad_distribucion`,
  `ciclo_vida`,
  `fenologia`
)
VALUES
(11, 'Menta\'i', 'Nombre científico es Mentha piperita L, es una planta muy popular cuya principal característica es la sensación de frescura que provoca en el paladar con su consumo', 'AC', 'https://minio.mindtechpy.net/api/v1/buckets/bucket-pohapp/objects/download?preview=true&prefix=menta.jpg&version_id=null', 'Mentha piperita L.', 'Lamiaceae', NULL, 'Zonas templadas y húmedas', 'Perenne', NULL),
(12, 'Jengibre', 'Planta medicinal eficaz como medicamento, especia o infusión', 'AC', 'https://minio.mindtechpy.net/api/v1/buckets/bucket-pohapp/objects/download?preview=true&prefix=genjibre.jpeg', 'Zingiber officinale', 'Zingiberaceae', NULL, 'Asia tropical', 'Perenne', NULL),
(13, 'Anís', 'Es una hierba de la familia de las apiáceas originaria del Asia sudoccidental y la cuenca mediterránea oriental', 'AC', 'https://minio.mindtechpy.net/api/v1/buckets/bucket-pohapp/objects/download?preview=true&prefix=anis-400x300.jpg', 'Pimpinella anisum', 'Apiaceae', NULL, 'Asia sudoccidental', 'Anual', NULL),
(14, 'Ruda', 'La ruda es un género de subarbustos siempreverdes fuertemente aromatizados...', 'AC', 'https://minio.mindtechpy.net/api/v1/buckets/bucket-pohapp/objects/download?preview=true&prefix=ruda1.png', 'Ruta graveolens', 'Rutaceae', NULL, 'Región mediterránea', 'Perenne', NULL),
(16, 'Boldo brasilero', 'Es un arbusto aromático y herbáceo que se usa en la medicina ayurvédica...', 'AC', 'https://minio.mindtechpy.net/api/v1/buckets/bucket-pohapp/objects/download?preview=true&prefix=1000001009.jpg', NULL, NULL, NULL, NULL, NULL, NULL),
(17, 'Uña de gato', 'Uncaria tomentosa, llamada popularmente uña de gato...', 'AC', 'https://minio.mindtechpy.net/api/v1/buckets/bucket-pohapp/objects/download?preview=true&prefix=1000001010.jpg', 'Uncaria tomentosa', 'Rubiaceae', NULL, 'Selva tropical sudamericana', 'Perenne', NULL),
(18, 'El cedrón kapi\'i (Cymbopogon citratus)', 'Es una hierba aromática y medicinal que se usa como condimento...', 'AC', 'https://minpoint.mindtechpy.net/bucket-pohapp/1000001046.jpg', 'Cymbopogon citratus', 'Poaceae', NULL, 'Trópicos y subtrópicos', 'Perenne', NULL),
(19, 'Santa Lucía (Achyrocline satureioides)', 'Es una planta medicinal y ornamental originaria de América del Sur', 'AC', 'https://minpoint.mindtechpy.net/bucket-pohapp/1000001047.jpg', 'Achyrocline satureioides', 'Asteraceae', NULL, 'Sudamérica', 'Anual o perenne', NULL),
(20, 'Burrito (Aloysia polystachya)', 'Es una planta medicinal y aromática originaria de América del Sur...', 'AC', 'https://minpoint.mindtechpy.net/bucket-pohapp/1000001048.jpg', 'Aloysia polystachya', 'Verbenaceae', NULL, 'Sudamérica', 'Perenne', NULL),
(21, 'Palo Amargo', 'El copalchi o palo amargo es una planta medicinal que proviene de la corteza...', 'AC', 'https://minpoint.mindtechpy.net/bucket-pohapp/1741395322979_1000001204.png', 'Hintonia latiflora', 'Rubiaceae', NULL, 'Centroamérica', 'Perenne', NULL),
(22, 'Verbena\'i', 'Género de plantas herbáceas o semileñosas con cerca de 250 especies...', 'AC', 'https://minpoint.mindtechpy.net/bucket-pohapp/1741713072345_1000000018.jpg', 'Verbena spp.', 'Verbenaceae', NULL, 'Regiones templadas y tropicales', NULL, NULL);

/*!40000 ALTER TABLE `planta` ENABLE KEYS */;
UNLOCK TABLES;


--
-- Table structure for table `poha`
--

DROP TABLE IF EXISTS `poha`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `poha` (
  `idpoha` int NOT NULL AUTO_INCREMENT,
  `preparado` varchar(600) NOT NULL,
  `estado` varchar(2) DEFAULT NULL,
  `mate` int DEFAULT NULL,
  `terere` int DEFAULT NULL,
  `te` int DEFAULT NULL,
  `recomendacion` varchar(600) DEFAULT NULL,
  `idautor` int NOT NULL,
  `idusuario` varchar(200) NOT NULL,
  PRIMARY KEY (`idpoha`,`idusuario`),
  KEY `fk_poha_autor1_idx` (`idautor`),
  KEY `fk_poha_usuario1_idx` (`idusuario`),
  CONSTRAINT `fk_poha_autor1` FOREIGN KEY (`idautor`) REFERENCES `autor` (`idautor`),
  CONSTRAINT `fk_poha_usuario1` FOREIGN KEY (`idusuario`) REFERENCES `usuario` (`idusuario`)
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `poha`
--

LOCK TABLES `poha` WRITE;
/*!40000 ALTER TABLE `poha` DISABLE KEYS */;
INSERT INTO `poha` VALUES (20,'Machacado en agua fresca o en un termo para tereré','AC',0,1,1,'No abusar en embarazadas ni niños pequeños. Puede irritar el estómago en exceso. Evitar si se tienen problemas biliares o reflujo severo.',18,'34D9bCXRw6eFCR1rA6iIg3IghwV2'),(21,'Machacar en mortero o rayar y vertir en agua caliente para mate o té ','AC',1,0,1,'No dejar hervir mucho tiempo el agua y no consumir en exceso',19,'34D9bCXRw6eFCR1rA6iIg3IghwV2'),(22,'1 cucharadita de anís por cada taza de agua ','AC',1,0,1,'Hervir el agua y posteriormente vertir el anís',20,'34D9bCXRw6eFCR1rA6iIg3IghwV2'),(25,'Añade una taza de agua a una herbidora, lleva a fuego medio. Cuando el agua comience a hervir agrega la ruda y deja al fuego durante 3 minutos, trascurrido este tiempo retírar y tapar durante 5 minutos para que repose. Colar la infusión de ruda y tomar. \nSe puede consumir machacado en agua.','AC',1,1,1,'Recuerde no tomar más de 3 tazas diarias y nunca consumir esta infusión si sospechas de embarazo.',23,'1'),(30,'Infusión: Hervir 1 litro de agua y añadir 1 cucharada de corteza o raíz seca. Cocinar a fuego lento por 10-15 minutos, reposar y colar. Beber hasta 3 tazas al día.\nMismas proporciones para terere.','AC',1,1,1,'No consumir en embarazo, lactancia ni niños pequeños. Puede interactuar con anticoagulantes e inmunosupresores. Evitar en trastornos hemorrágicos o trasplantes recientes. Consultar al médico antes de su uso.',1,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(31,'Infusión con hojas frescas o secas en agua caliente o fría. También en mate o tereré.','AC',1,1,1,'No abusar en embarazadas. Puede bajar la presión arterial.',1,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(32,'Infusión de flores secas en agua caliente o fría. Excelente en mate o tereré.','AC',1,1,1,'No consumir en exceso, puede bajar la presión.',1,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(33,'Infusión en té, mate o tereré con hojas frescas o secas.','AC',1,1,1,'Evitar en exceso si se tiene baja presión arterial.',1,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(36,'aa','AC',1,1,1,'aa',1,'ULWtPfXaBtPgGJpfxfiolyRYprX2');
/*!40000 ALTER TABLE `poha` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `poha_planta`
--

DROP TABLE IF EXISTS `poha_planta`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `poha_planta` (
  `idplanta` int NOT NULL,
  `idpoha` int NOT NULL,
  `idusuario` varchar(200) NOT NULL,
  PRIMARY KEY (`idplanta`,`idpoha`,`idusuario`),
  KEY `fk_poha_has_planta_planta1_idx` (`idplanta`),
  KEY `fk_poha_planta_poha1_idx` (`idpoha`,`idusuario`),
  CONSTRAINT `fk_poha_has_planta_planta1` FOREIGN KEY (`idplanta`) REFERENCES `planta` (`idplanta`),
  CONSTRAINT `fk_poha_planta_poha1` FOREIGN KEY (`idpoha`, `idusuario`) REFERENCES `poha` (`idpoha`, `idusuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `poha_planta`
--

LOCK TABLES `poha_planta` WRITE;
/*!40000 ALTER TABLE `poha_planta` DISABLE KEYS */;
INSERT INTO `poha_planta` VALUES (11,20,'34D9bCXRw6eFCR1rA6iIg3IghwV2'),(11,36,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(12,21,'34D9bCXRw6eFCR1rA6iIg3IghwV2'),(13,22,'34D9bCXRw6eFCR1rA6iIg3IghwV2'),(14,25,'1'),(14,36,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(17,30,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(17,36,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(18,31,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(19,32,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(19,36,'ULWtPfXaBtPgGJpfxfiolyRYprX2'),(20,33,'ULWtPfXaBtPgGJpfxfiolyRYprX2');
/*!40000 ALTER TABLE `poha_planta` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `puntos`
--

DROP TABLE IF EXISTS `puntos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `puntos` (
  `idpoha` int NOT NULL,
  `idusuario` varchar(200) NOT NULL,
  `puntos` int DEFAULT NULL,
  `comentario` varchar(200) DEFAULT NULL,
  PRIMARY KEY (`idpoha`,`idusuario`),
  KEY `fk_poha_has_usuario_usuario1_idx` (`idusuario`),
  KEY `fk_poha_has_usuario_poha1_idx` (`idpoha`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `puntos`
--

LOCK TABLES `puntos` WRITE;
/*!40000 ALTER TABLE `puntos` DISABLE KEYS */;
/*!40000 ALTER TABLE `puntos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuario`
--

DROP TABLE IF EXISTS `usuario`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuario` (
  `idusuario` varchar(200) NOT NULL,
  `correo` varchar(45) DEFAULT NULL,
  `nombre` varchar(100) DEFAULT NULL,
  `uid` varchar(200) DEFAULT NULL,
  `photourl` varchar(100) DEFAULT NULL,
  `isAdmin` int DEFAULT NULL,
  PRIMARY KEY (`idusuario`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb3;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuario`
--

LOCK TABLES `usuario` WRITE;
/*!40000 ALTER TABLE `usuario` DISABLE KEYS */;
INSERT INTO `usuario` VALUES ('1','Sin correo','invitado','1','',0),('34D9bCXRw6eFCR1rA6iIg3IghwV2','andyvercha@gmail.com','Andrés Valentin Vera Chávez','34D9bCXRw6eFCR1rA6iIg3IghwV2','https://lh3.googleusercontent.com/a-/AFdZucp478WwNXOc7ph1uqpuf-JvjZLCIJxOXBgi-HlDSQ=s96-c',0),('ULWtPfXaBtPgGJpfxfiolyRYprX2','andyvercha@gmail.com','Andrés Valentin Vera Chávez','ULWtPfXaBtPgGJpfxfiolyRYprX2','https://lh3.googleusercontent.com/a/ACg8ocJiUk6z7swDhvUKc_2wsCToOIdXdcDMdFACIhUjE_gPBUxECWKP=s96-c',1);
/*!40000 ALTER TABLE `usuario` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `vw_medicina`
--

DROP TABLE IF EXISTS `vw_medicina`;
/*!50001 DROP VIEW IF EXISTS `vw_medicina`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `vw_medicina` AS SELECT 
 1 AS `idpoha`,
 1 AS `preparado`,
 1 AS `estado`,
 1 AS `mate`,
 1 AS `terere`,
 1 AS `te`,
 1 AS `recomendacion`,
 1 AS `idautor`,
 1 AS `idusuario`,
 1 AS `descripcion`,
 1 AS `iddolencias`,
 1 AS `idpoha1`,
 1 AS `nombre1`,
 1 AS `descripcion1`,
 1 AS `img1`,
 1 AS `nombre2`,
 1 AS `descripcion2`,
 1 AS `img2`,
 1 AS `nombre3`,
 1 AS `descripcion3`,
 1 AS `img3`,
 1 AS `nombre4`,
 1 AS `descripcion4`,
 1 AS `img4`,
 1 AS `nombre5`,
 1 AS `descripcion5`,
 1 AS `img5`,
 1 AS `nombre6`,
 1 AS `descripcion6`,
 1 AS `img6`,
 1 AS `autor`,
 1 AS `nacimiento`,
 1 AS `ciudad`,
 1 AS `pais`*/;
SET character_set_client = @saved_cs_client;

--
-- Final view structure for view `vw_medicina`
--

/*!50001 DROP VIEW IF EXISTS `vw_medicina`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_0900_ai_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013 DEFINER=`root`@`%` SQL SECURITY DEFINER */
/*!50001 VIEW `vw_medicina` AS with `cplantas` as (select `pp1`.`idpoha` AS `idpoha`,`pp1`.`idplanta` AS `idplanta1`,`pp2`.`idplanta` AS `idplanta2`,`pp3`.`idplanta` AS `idplanta3`,`pp4`.`idplanta` AS `idplanta4`,`pp5`.`idplanta` AS `idplanta5`,`pp6`.`idplanta` AS `idplanta6` from (((((`poha_planta` `pp1` left join `poha_planta` `pp2` on(((`pp1`.`idpoha` = `pp2`.`idpoha`) and (`pp1`.`idplanta` <> `pp2`.`idplanta`)))) left join `poha_planta` `pp3` on(((`pp1`.`idpoha` = `pp3`.`idpoha`) and (`pp1`.`idplanta` <> `pp3`.`idplanta`) and (`pp2`.`idplanta` <> `pp3`.`idplanta`)))) left join `poha_planta` `pp4` on(((`pp1`.`idpoha` = `pp4`.`idpoha`) and (`pp1`.`idplanta` <> `pp4`.`idplanta`) and (`pp2`.`idplanta` <> `pp4`.`idplanta`) and (`pp3`.`idplanta` <> `pp4`.`idplanta`)))) left join `poha_planta` `pp5` on(((`pp1`.`idpoha` = `pp5`.`idpoha`) and (`pp1`.`idplanta` <> `pp5`.`idplanta`) and (`pp2`.`idplanta` <> `pp5`.`idplanta`) and (`pp3`.`idplanta` <> `pp5`.`idplanta`) and (`pp4`.`idplanta` <> `pp5`.`idplanta`)))) left join `poha_planta` `pp6` on(((`pp1`.`idpoha` = `pp6`.`idpoha`) and (`pp1`.`idplanta` <> `pp6`.`idplanta`) and (`pp2`.`idplanta` <> `pp6`.`idplanta`) and (`pp3`.`idplanta` <> `pp6`.`idplanta`) and (`pp4`.`idplanta` <> `pp6`.`idplanta`) and (`pp5`.`idplanta` <> `pp6`.`idplanta`)))) group by `pp1`.`idpoha`), `cpoha_plantas` as (select `c`.`idpoha` AS `idpoha1`,`pl1`.`nombre` AS `nombre1`,`pl1`.`descripcion` AS `descripcion1`,`pl1`.`img` AS `img1`,`pl2`.`nombre` AS `nombre2`,`pl2`.`descripcion` AS `descripcion2`,`pl2`.`img` AS `img2`,`pl3`.`nombre` AS `nombre3`,`pl3`.`descripcion` AS `descripcion3`,`pl3`.`img` AS `img3`,`pl4`.`nombre` AS `nombre4`,`pl4`.`descripcion` AS `descripcion4`,`pl4`.`img` AS `img4`,`pl5`.`nombre` AS `nombre5`,`pl5`.`descripcion` AS `descripcion5`,`pl5`.`img` AS `img5`,`pl6`.`nombre` AS `nombre6`,`pl6`.`descripcion` AS `descripcion6`,`pl6`.`img` AS `img6` from ((((((`cplantas` `c` join `planta` `pl1` on((`pl1`.`idplanta` = `c`.`idplanta1`))) left join `planta` `pl2` on((`pl2`.`idplanta` = `c`.`idplanta2`))) left join `planta` `pl3` on((`pl3`.`idplanta` = `c`.`idplanta3`))) left join `planta` `pl4` on((`pl4`.`idplanta` = `c`.`idplanta4`))) left join `planta` `pl5` on((`pl5`.`idplanta` = `c`.`idplanta5`))) left join `planta` `pl6` on((`pl6`.`idplanta` = `c`.`idplanta6`)))), `cdolencias_poha` as (select `dp`.`idpoha` AS `idpoha`,group_concat(`d`.`descripcion` separator ', ') AS `descripcion`,group_concat(concat(',',`d`.`iddolencias`) separator '') AS `iddolencias` from (`dolencias_poha` `dp` join `dolencias` `d` on((`d`.`iddolencias` = `dp`.`iddolencias`))) group by `dp`.`idpoha`) select `p`.`idpoha` AS `idpoha`,`p`.`preparado` AS `preparado`,`p`.`estado` AS `estado`,`p`.`mate` AS `mate`,`p`.`terere` AS `terere`,`p`.`te` AS `te`,`p`.`recomendacion` AS `recomendacion`,`p`.`idautor` AS `idautor`,`p`.`idusuario` AS `idusuario`,`dp`.`descripcion` AS `descripcion`,`dp`.`iddolencias` AS `iddolencias`,`pp`.`idpoha1` AS `idpoha1`,`pp`.`nombre1` AS `nombre1`,`pp`.`descripcion1` AS `descripcion1`,`pp`.`img1` AS `img1`,`pp`.`nombre2` AS `nombre2`,`pp`.`descripcion2` AS `descripcion2`,`pp`.`img2` AS `img2`,`pp`.`nombre3` AS `nombre3`,`pp`.`descripcion3` AS `descripcion3`,`pp`.`img3` AS `img3`,`pp`.`nombre4` AS `nombre4`,`pp`.`descripcion4` AS `descripcion4`,`pp`.`img4` AS `img4`,`pp`.`nombre5` AS `nombre5`,`pp`.`descripcion5` AS `descripcion5`,`pp`.`img5` AS `img5`,`pp`.`nombre6` AS `nombre6`,`pp`.`descripcion6` AS `descripcion6`,`pp`.`img6` AS `img6`,concat(`au`.`nombre`,' ',`au`.`apellido`) AS `autor`,`au`.`nacimiento` AS `nacimiento`,`au`.`ciudad` AS `ciudad`,`au`.`pais` AS `pais` from (((`poha` `p` join `cdolencias_poha` `dp` on((`dp`.`idpoha` = `p`.`idpoha`))) join `cpoha_plantas` `pp` on((`pp`.`idpoha1` = `p`.`idpoha`))) join `autor` `au` on((`au`.`idautor` = `p`.`idautor`))) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-03-11 14:25:23


CREATE OR REPLACE VIEW vwpoha AS
SELECT 
    p.idpoha,
    p.preparado,
    p.recomendacion,
    GROUP_CONCAT(DISTINCT d.descripcion SEPARATOR '|') AS dolencias,
    GROUP_CONCAT(DISTINCT pl.nombre SEPARATOR '|') AS plantas_nombres,
    GROUP_CONCAT(DISTINCT pl.nombre_cientifico SEPARATOR '|') AS plantas_cientificos,
    GROUP_CONCAT(DISTINCT pl.familia SEPARATOR '|') AS plantas_familias,
    GROUP_CONCAT(DISTINCT CONCAT_WS('|', pl.nombre, pl.nombre_cientifico, pl.familia, pl.subfamilia, pl.habitad_distribucion, pl.ciclo_vida, pl.fenologia) SEPARATOR '||') AS plantas_completo
FROM 
    poha p
LEFT JOIN dolencias_poha dp ON p.idpoha = dp.idpoha AND p.idusuario = dp.idusuario
LEFT JOIN dolencias d ON dp.iddolencias = d.iddolencias
LEFT JOIN poha_planta pp ON p.idpoha = pp.idpoha AND p.idusuario = pp.idusuario
LEFT JOIN planta pl ON pp.idplanta = pl.idplanta
WHERE 
    p.estado = 'AC'
GROUP BY 
    p.idpoha, p.preparado, p.recomendacion;

-- IA: tablas y vista de entrenamiento (requeridas por /query-nlp/*)
CREATE TABLE IF NOT EXISTS medicina_embeddings (
  idpoha INT PRIMARY KEY,
  resumen TEXT,
  embedding JSON
);

CREATE TABLE IF NOT EXISTS chat_historial (
  id INT AUTO_INCREMENT PRIMARY KEY,
  idusuario VARCHAR(200) NOT NULL,
  pregunta TEXT,
  respuesta TEXT,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  idpoha_json JSON,
  imagenes_json JSON
);

CREATE OR REPLACE VIEW vw_medicina_entrenamiento AS
SELECT 
    p.idpoha,
    GROUP_CONCAT(DISTINCT d.descripcion SEPARATOR ', ') AS dolencias,
    GROUP_CONCAT(DISTINCT pl.nombre SEPARATOR ', ') AS plantas,
    GROUP_CONCAT(DISTINCT pl.nombre_cientifico SEPARATOR ', ') AS cientificos,
    GROUP_CONCAT(DISTINCT pl.familia SEPARATOR ', ') AS familias,

    CONCAT_WS('. ',
        CONCAT('Esta preparación es útil para tratar: ', GROUP_CONCAT(DISTINCT d.descripcion SEPARATOR ', ')),
        CONCAT('Dolencias mencionadas: ', GROUP_CONCAT(DISTINCT d.descripcion SEPARATOR ', ')),
        CONCAT('Modo de preparación sugerido: ', MAX(p.preparado)),
        CONCAT('Precauciones: ', IFNULL(MAX(p.recomendacion), 'Ninguna advertencia importante.')),
        CONCAT('Esta mezcla contiene las siguientes plantas: ',
            GROUP_CONCAT(
                DISTINCT CONCAT(pl.nombre, ' (', pl.nombre_cientifico, ', familia ', pl.familia, ')')
                SEPARATOR ', '
            )
        ),
        CONCAT('Detalles adicionales de cada planta: ',
            GROUP_CONCAT(
                DISTINCT CONCAT_WS('. ',
                    pl.nombre,
                    pl.descripcion,
                    CONCAT('Hábitat: ', pl.habitad_distribucion),
                    CONCAT('Ciclo de vida: ', pl.ciclo_vida)
                ) SEPARATOR '. '
            )
        )
    ) AS texto_entrenamiento,

    (
      SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
          'nombre', subpl.nombre,
          'nombre_cientifico', subpl.nombre_cientifico,
          'familia', subpl.familia,
          'imagen', subpl.img
        )
      )
      FROM (
        SELECT DISTINCT pl.idplanta, pl.nombre, pl.nombre_cientifico, pl.familia, pl.img
        FROM poha_planta pp2
        JOIN planta pl ON pl.idplanta = pp2.idplanta
        WHERE pp2.idpoha = p.idpoha AND pl.img IS NOT NULL AND pl.img <> ''
      ) AS subpl
    ) AS plantas_detalle_json

FROM poha p
LEFT JOIN dolencias_poha dp ON p.idpoha = dp.idpoha AND p.idusuario = dp.idusuario
LEFT JOIN dolencias d ON d.iddolencias = dp.iddolencias
LEFT JOIN poha_planta pp ON p.idpoha = pp.idpoha AND p.idusuario = pp.idusuario
LEFT JOIN planta pl ON pl.idplanta = pp.idplanta
WHERE p.estado = 'AC'
GROUP BY p.idpoha;

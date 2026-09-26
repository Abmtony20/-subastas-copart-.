IF OBJECT_ID('dbo.Usuarios') IS NULL
CREATE TABLE dbo.Usuarios (
  Id        INT IDENTITY PRIMARY KEY,
  Nombre    NVARCHAR(80)  NOT NULL,
  Apellido  NVARCHAR(80)  NOT NULL,
  Correo    NVARCHAR(160) NOT NULL CONSTRAINT UQ_Usuarios_Correo UNIQUE,
  Telefono  NVARCHAR(20)  NOT NULL,
  ClaveHash NVARCHAR(100) NOT NULL,
  CreadoEn  DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME()
);

IF OBJECT_ID('dbo.Vehiculos') IS NULL
CREATE TABLE dbo.Vehiculos (
  Id          INT IDENTITY PRIMARY KEY,
  UsuarioId   INT           NOT NULL REFERENCES dbo.Usuarios(Id),
  Anio        SMALLINT      NOT NULL CHECK (Anio BETWEEN 1950 AND 2030),
  Tipo        NVARCHAR(40)  NOT NULL,
  Marca       NVARCHAR(60)  NOT NULL,
  Modelo      NVARCHAR(60)  NOT NULL,
  Motor       NVARCHAR(60)  NOT NULL,
  Transmision NVARCHAR(20)  NOT NULL,
  Combustible NVARCHAR(20)  NOT NULL,
  Traccion    VARCHAR(3)    NOT NULL CHECK (Traccion IN ('AWD', 'FWD', 'RWD', '4WD')),
  Cilindros   TINYINT       NOT NULL CHECK (Cilindros BETWEEN 1 AND 16),
  Danio       VARCHAR(10)   NOT NULL CHECK (Danio IN ('verde', 'amarillo', 'rojo')),
  PrecioBase  INT           NOT NULL CHECK (PrecioBase > 0),
  InicioMs    BIGINT        NOT NULL,
  CierreMs    BIGINT        NOT NULL,
  Portada     VARCHAR(MAX)  NOT NULL,
  CreadoEn    DATETIME2     NOT NULL DEFAULT SYSUTCDATETIME(),
  CONSTRAINT CK_Vehiculos_Fechas CHECK (CierreMs > InicioMs)
);

IF OBJECT_ID('dbo.Fotos') IS NULL
CREATE TABLE dbo.Fotos (
  Id         INT IDENTITY PRIMARY KEY,
  VehiculoId INT          NOT NULL REFERENCES dbo.Vehiculos(Id) ON DELETE CASCADE,
  Orden      TINYINT      NOT NULL,
  Datos      VARCHAR(MAX) NOT NULL
);

IF OBJECT_ID('dbo.Pujas') IS NULL
CREATE TABLE dbo.Pujas (
  Id         INT IDENTITY PRIMARY KEY,
  VehiculoId INT       NOT NULL REFERENCES dbo.Vehiculos(Id),
  UsuarioId  INT       NOT NULL REFERENCES dbo.Usuarios(Id),
  Monto      INT       NOT NULL,
  Fecha      DATETIME2 NOT NULL DEFAULT SYSUTCDATETIME()
);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Pujas_Vehiculo')
  CREATE INDEX IX_Pujas_Vehiculo ON dbo.Pujas (VehiculoId, Monto DESC);
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_Fotos_Vehiculo')
  CREATE INDEX IX_Fotos_Vehiculo ON dbo.Fotos (VehiculoId, Orden);

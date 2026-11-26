import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/** Swagger UI at /docs. */
export function setupSwagger(app: INestApplication): void {
  const config = new DocumentBuilder()
    .setTitle('Salon Booking API')
    // Adds the X-Salon-Id header to every endpoint.
    .addGlobalParameters({
      name: 'X-Salon-Id',
      in: 'header',
      required: true,
      schema: { type: 'integer', example: 1 },
    })
    .build();

  SwaggerModule.setup('docs', app, () =>
    SwaggerModule.createDocument(app, config),
  );
}

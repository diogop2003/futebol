FROM php:8.4-fpm
RUN docker-php-ext-install pdo_mysql && mkdir -p /var/lib/php/sessions && chown www-data:www-data /var/lib/php/sessions
COPY deploy/php.ini /usr/local/etc/php/conf.d/pelada.ini
WORKDIR /var/www/api
COPY api/ /var/www/api/
COPY legacy/ /var/www/legacy/
USER www-data

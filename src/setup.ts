import cls from 'cls-hooked';
import { Sequelize } from 'sequelize';

const namespace = cls.createNamespace('sequelize');
Sequelize.useCLS(namespace);
